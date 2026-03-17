import { ORPCError } from "@orpc/server";
import prisma from "@my-better-t-app/db";
import z from "zod";

import { protectedProcedure, publicProcedure } from "..";

function baseUsernameFromEmail(email: string) {
  const base = email.split("@")[0] ?? "user";
  return (
    base
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_")
      .slice(0, 20) || "user"
  );
}

async function createUniqueUsername(email: string) {
  const base = baseUsernameFromEmail(email);
  let candidate = base;
  let suffix = 1;

  // Trouve un username disponible, en suffixant si nécessaire.
  while (await prisma.appUser.findUnique({ where: { username: candidate } })) {
    suffix += 1;
    candidate = `${base}_${suffix}`;
  }

  return candidate;
}

async function ensureAppUserByEmail(email: string) {
  const existing = await prisma.appUser.findUnique({ where: { email } });
  if (existing) {
    return existing;
  }

  const username = await createUniqueUsername(email);

  return prisma.appUser.create({
    data: {
      email,
      username,
      passwordHash: "managed-by-better-auth",
    },
  });
}

const userRouter = {
  // Recherche des utilisateurs par username (insensible à la casse)
  // Retourne id, username et isFollowing pour chaque résultat
  search: publicProcedure
    .input(z.object({ query: z.string().max(50) }))
    .handler(async ({ input, context }) => {
      const searchQuery = input.query.trim();
      if (!searchQuery) {
        return [];
      }

      let currentAppUserId: number | undefined;

      if (context.session?.user?.email) {
        const appUser = await ensureAppUserByEmail(context.session.user.email);
        currentAppUserId = appUser.id;
      }

      const authUsers = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" } },
            { email: { contains: searchQuery, mode: "insensitive" } },
          ],
          ...(context.session?.user?.email ? { email: { not: context.session.user.email } } : {}),
        },
        select: { email: true, name: true },
        take: 20,
      });

      const appUsers = await Promise.all(
        authUsers.map((authUser) => ensureAppUserByEmail(authUser.email)),
      );

      let followedIds = new Set<number>();
      if (currentAppUserId && appUsers.length > 0) {
        const followRows = await prisma.follow.findMany({
          where: {
            followerId: currentAppUserId,
            followingId: { in: appUsers.map((user) => user.id) },
          },
          select: { followingId: true },
        });
        followedIds = new Set(followRows.map((row) => row.followingId));
      }

      return appUsers.map((user) => ({
        id: user.id,
        username: user.username,
        isFollowing: followedIds.has(user.id),
      }));
    }),

  // Suivre un utilisateur (crée un enregistrement Follow)
  follow: protectedProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .handler(async ({ input, context }) => {
      const appUser = await ensureAppUserByEmail(context.session.user.email);

      if (!appUser) {
        throw new ORPCError("NOT_FOUND", { message: "Utilisateur introuvable." });
      }

      if (appUser.id === input.userId) {
        throw new ORPCError("BAD_REQUEST", { message: "Tu ne peux pas te suivre toi-même." });
      }

      await prisma.follow.upsert({
        where: {
          followerId_followingId: {
            followerId: appUser.id,
            followingId: input.userId,
          },
        },
        create: { followerId: appUser.id, followingId: input.userId },
        update: {},
      });

      return { success: true };
    }),

  // Ne plus suivre un utilisateur (supprime l'enregistrement Follow)
  unfollow: protectedProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .handler(async ({ input, context }) => {
      const appUser = await ensureAppUserByEmail(context.session.user.email);

      if (!appUser) {
        throw new ORPCError("NOT_FOUND", { message: "Utilisateur introuvable." });
      }

      await prisma.follow.deleteMany({
        where: { followerId: appUser.id, followingId: input.userId },
      });

      return { success: true };
    }),
};

export default userRouter;
