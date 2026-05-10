import { ORPCError } from "@orpc/server";
import prisma from "@my-better-t-app/db";
import z from "zod";

import { protectedProcedure } from "..";

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

async function ensureCurrentAppUser(sessionEmail?: string) {
  if (!sessionEmail) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Tu dois être connecté(e).",
    });
  }

  return ensureAppUserByEmail(sessionEmail);
}

async function getFriendIds(currentAppUserId: number, candidateIds: number[]) {
  if (candidateIds.length === 0) {
    return new Set<number>();
  }

  const rows = await prisma.follow.findMany({
    where: {
      followerId: currentAppUserId,
      followingId: { in: candidateIds },
      following: {
        following: {
          some: {
            followingId: currentAppUserId,
          },
        },
      },
    },
    select: { followingId: true },
  });

  return new Set(rows.map((row) => row.followingId));
}

function avatarUrlFromUsername(username: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0f766e&color=ffffff&size=256&bold=true&format=png`;
}

async function getRelationStatus(
  currentAppUserId: number,
  targetAppUserId: number,
) {
  if (currentAppUserId === targetAppUserId) {
    return "self" as const;
  }

  const [friendIds, outgoingRequest, incomingRequest] = await Promise.all([
    getFriendIds(currentAppUserId, [targetAppUserId]),
    prisma.friendRequest.findFirst({
      where: {
        senderId: currentAppUserId,
        receiverId: targetAppUserId,
        status: "PENDING",
      },
      select: { id: true },
    }),
    prisma.friendRequest.findFirst({
      where: {
        senderId: targetAppUserId,
        receiverId: currentAppUserId,
        status: "PENDING",
      },
      select: { id: true },
    }),
  ]);

  if (friendIds.has(targetAppUserId)) {
    return "friend" as const;
  }

  if (incomingRequest) {
    return "incoming_pending" as const;
  }

  if (outgoingRequest) {
    return "outgoing_pending" as const;
  }

  return "none" as const;
}

const userRouter = {
  // Recherche des utilisateurs et retourne leur état de relation.
  search: protectedProcedure
    .input(z.object({ query: z.string().max(50) }))
    .handler(async ({ input, context }) => {
      const searchQuery = input.query.trim();
      if (!searchQuery) {
        return [];
      }

      const currentAppUser = await ensureCurrentAppUser(
        context.session.user.email,
      );

      const authUsers = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" } },
            { email: { contains: searchQuery, mode: "insensitive" } },
          ],
          email: { not: context.session.user.email },
        },
        select: { email: true, name: true },
        take: 20,
      });

      const appUsers = await Promise.all(
        authUsers.map((authUser) => ensureAppUserByEmail(authUser.email)),
      );

      const candidateIds = appUsers.map((user) => user.id);

      const [friendIds, outgoingRows, incomingRows] = await Promise.all([
        getFriendIds(currentAppUser.id, candidateIds),
        prisma.friendRequest.findMany({
          where: {
            senderId: currentAppUser.id,
            receiverId: { in: candidateIds },
            status: "PENDING",
          },
          select: { receiverId: true },
        }),
        prisma.friendRequest.findMany({
          where: {
            senderId: { in: candidateIds },
            receiverId: currentAppUser.id,
            status: "PENDING",
          },
          select: { senderId: true },
        }),
      ]);

      const outgoingPendingIds = new Set(
        outgoingRows.map((row) => row.receiverId),
      );
      const incomingPendingIds = new Set(
        incomingRows.map((row) => row.senderId),
      );

      return appUsers.map((user) => {
        let relationStatus:
          | "none"
          | "outgoing_pending"
          | "incoming_pending"
          | "friend" = "none";

        if (friendIds.has(user.id)) {
          relationStatus = "friend";
        } else if (incomingPendingIds.has(user.id)) {
          relationStatus = "incoming_pending";
        } else if (outgoingPendingIds.has(user.id)) {
          relationStatus = "outgoing_pending";
        }

        return {
          id: user.id,
          username: user.username,
          avatarUrl: avatarUrlFromUsername(user.username),
          relationStatus,
        };
      });
    }),

  // Retourne le profil d'un utilisateur avec le contenu qu'il est possible d'afficher au visiteur.
  profile: protectedProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .handler(async ({ input, context }) => {
      const currentAppUser = await ensureCurrentAppUser(
        context.session.user.email,
      );

      const targetUser = await prisma.appUser.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          username: true,
        },
      });

      if (!targetUser) {
        throw new ORPCError("NOT_FOUND", {
          message: "Profil utilisateur introuvable.",
        });
      }

      const relationStatus = await getRelationStatus(
        currentAppUser.id,
        targetUser.id,
      );
      const canSeePrivateContent =
        relationStatus === "self" || relationStatus === "friend";

      const recipes = await prisma.recipe.findMany({
        where: {
          authorId: targetUser.id,
          ...(canSeePrivateContent ? {} : { isPublic: true }),
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          isPublic: true,
          prepTime: true,
          author: { select: { passwordHash: true } },
        },
      });

      const collections = canSeePrivateContent
        ? await prisma.collection.findMany({
            where: { userId: targetUser.id },
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              name: true,
              createdAt: true,
              _count: {
                select: { recipes: true },
              },
            },
          })
        : [];

      return {
        id: targetUser.id,
        username: targetUser.username,
        avatarUrl: avatarUrlFromUsername(targetUser.username),
        relationStatus,
        canSeePrivateContent,
        recipes: recipes.map(({ author, ...recipe }) => ({
          ...recipe,
          showVisibilityBadge: author.passwordHash === "managed-by-better-auth",
        })),
        collections: collections.map((collection) => ({
          id: collection.id,
          name: collection.name,
          createdAt: collection.createdAt,
          recipesCount: collection._count.recipes,
        })),
      };
    }),

  // Envoie une demande d'ami au destinataire.
  sendFriendRequest: protectedProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .handler(async ({ input, context }) => {
      const currentAppUser = await ensureCurrentAppUser(
        context.session.user.email,
      );

      if (currentAppUser.id === input.userId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Tu ne peux pas t'ajouter en ami.",
        });
      }

      const targetUser = await prisma.appUser.findUnique({
        where: { id: input.userId },
        select: { id: true },
      });

      if (!targetUser) {
        throw new ORPCError("NOT_FOUND", {
          message: "Utilisateur introuvable.",
        });
      }

      const friends = await getFriendIds(currentAppUser.id, [input.userId]);
      if (friends.has(input.userId)) {
        return { success: true, state: "friend" as const };
      }

      const incomingPending = await prisma.friendRequest.findFirst({
        where: {
          senderId: input.userId,
          receiverId: currentAppUser.id,
          status: "PENDING",
        },
        select: { id: true },
      });

      if (incomingPending) {
        return { success: true, state: "incoming_pending" as const };
      }

      await prisma.friendRequest.upsert({
        where: {
          senderId_receiverId: {
            senderId: currentAppUser.id,
            receiverId: input.userId,
          },
        },
        create: {
          senderId: currentAppUser.id,
          receiverId: input.userId,
          status: "PENDING",
        },
        update: {
          status: "PENDING",
        },
      });

      return { success: true, state: "outgoing_pending" as const };
    }),

  // Liste des demandes reçues en attente pour l'utilisateur connecté.
  pendingRequests: protectedProcedure.handler(async ({ context }) => {
    const currentAppUser = await ensureCurrentAppUser(
      context.session.user.email,
    );

    const rows = await prisma.friendRequest.findMany({
      where: {
        receiverId: currentAppUser.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      requestId: row.id,
      senderId: row.sender.id,
      username: row.sender.username,
      createdAt: row.createdAt,
    }));
  }),

  // Accepte ou refuse une demande d'ami reçue.
  respondToFriendRequest: protectedProcedure
    .input(
      z.object({
        requestId: z.number().int().positive(),
        action: z.enum(["accept", "reject"]),
      }),
    )
    .handler(async ({ input, context }) => {
      const currentAppUser = await ensureCurrentAppUser(
        context.session.user.email,
      );

      const request = await prisma.friendRequest.findFirst({
        where: {
          id: input.requestId,
          receiverId: currentAppUser.id,
          status: "PENDING",
        },
        select: {
          id: true,
          senderId: true,
          receiverId: true,
        },
      });

      if (!request) {
        throw new ORPCError("NOT_FOUND", { message: "Demande introuvable." });
      }

      if (input.action === "reject") {
        await prisma.friendRequest.update({
          where: { id: request.id },
          data: { status: "REJECTED" },
        });

        return { success: true, accepted: false };
      }

      await prisma.$transaction([
        prisma.friendRequest.update({
          where: { id: request.id },
          data: { status: "ACCEPTED" },
        }),
        prisma.follow.createMany({
          data: [
            { followerId: request.senderId, followingId: request.receiverId },
            { followerId: request.receiverId, followingId: request.senderId },
          ],
          skipDuplicates: true,
        }),
      ]);

      return { success: true, accepted: true };
    }),

  // Liste des amis de l'utilisateur connecté.
  friends: protectedProcedure.handler(async ({ context }) => {
    const currentAppUser = await ensureCurrentAppUser(
      context.session.user.email,
    );

    const friends = await prisma.appUser.findMany({
      where: {
        id: { not: currentAppUser.id },
        followers: {
          some: {
            followerId: currentAppUser.id,
          },
        },
        following: {
          some: {
            followingId: currentAppUser.id,
          },
        },
      },
      select: {
        id: true,
        username: true,
      },
      orderBy: {
        username: "asc",
      },
    });

    return friends.map((friend) => ({
      ...friend,
      avatarUrl: avatarUrlFromUsername(friend.username),
    }));
  }),
};

export default userRouter;
