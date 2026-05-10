import { ORPCError } from "@orpc/server";
import prisma from "@my-better-t-app/db";
import z from "zod";

import { protectedProcedure } from "..";

function accessWhereForViewer(viewerId: number) {
  return {
    OR: [
      { isPublic: true },
      { authorId: viewerId },
      {
        author: {
          followers: {
            some: {
              followerId: viewerId,
            },
          },
          following: {
            some: {
              followingId: viewerId,
            },
          },
        },
      },
    ],
  };
}

async function ensureCurrentAppUser(sessionEmail?: string) {
  if (!sessionEmail) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Tu dois etre connecte(e).",
    });
  }

  const existing = await prisma.appUser.findUnique({
    where: { email: sessionEmail },
  });

  if (!existing) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Profil utilisateur introuvable.",
    });
  }

  return existing;
}

const collectionInput = z.object({
  name: z.string().trim().min(1).max(80),
});

const collectionIdInput = z.object({
  id: z.number().int().positive(),
});

function isGenericRecipeAuthor(email?: string | null) {
  return Boolean(email?.endsWith("@example.com"));
}

const addRecipeInput = z.object({
  collectionId: z.number().int().positive(),
  recipeId: z.number().int().positive(),
});

const listMineInput = z
  .object({
    recipeId: z.number().int().positive().optional(),
  })
  .optional();

const collectionRouter = {
  create: protectedProcedure
    .input(collectionInput)
    .handler(async ({ input, context }) => {
      const appUser = await ensureCurrentAppUser(context.session.user.email);

      return prisma.collection.create({
        data: {
          name: input.name,
          userId: appUser.id,
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      });
    }),

  listMine: protectedProcedure
    .input(listMineInput)
    .handler(async ({ input, context }) => {
      const appUser = await ensureCurrentAppUser(context.session.user.email);

      const rows = await prisma.collection.findMany({
        where: { userId: appUser.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: {
            select: { recipes: true },
          },
          recipes: input?.recipeId
            ? {
                where: { recipeId: input.recipeId },
                select: { recipeId: true },
                take: 1,
              }
            : false,
        },
      });

      return rows.map((collection) => ({
        id: collection.id,
        name: collection.name,
        createdAt: collection.createdAt,
        recipesCount: collection._count.recipes,
        hasRecipe: input?.recipeId ? collection.recipes.length > 0 : false,
      }));
    }),

  byId: protectedProcedure
    .input(collectionIdInput)
    .handler(async ({ input, context }) => {
      const appUser = await ensureCurrentAppUser(context.session.user.email);

      const collection = await prisma.collection.findFirst({
        where: {
          id: input.id,
          userId: appUser.id,
        },
        include: {
          recipes: {
            orderBy: {
              recipe: {
                createdAt: "desc",
              },
            },
            include: {
              recipe: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  imageUrl: true,
                  isPublic: true,
                  prepTime: true,
                  author: {
                    select: {
                      passwordHash: true,
                      username: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!collection) {
        throw new ORPCError("NOT_FOUND", {
          message: "Collection introuvable.",
        });
      }

      const recipes = collection.recipes
        .map((entry) => entry.recipe)
        .map(({ author, ...recipe }) => ({
          ...recipe,
          authorName: isGenericRecipeAuthor(author.email)
            ? null
            : author.username,
          showVisibilityBadge: author.passwordHash === "managed-by-better-auth",
        }));

      return {
        id: collection.id,
        name: collection.name,
        createdAt: collection.createdAt,
        recipes,
      };
    }),

  addRecipe: protectedProcedure
    .input(addRecipeInput)
    .handler(async ({ input, context }) => {
      const appUser = await ensureCurrentAppUser(context.session.user.email);

      const collection = await prisma.collection.findFirst({
        where: {
          id: input.collectionId,
          userId: appUser.id,
        },
        select: { id: true },
      });

      if (!collection) {
        throw new ORPCError("FORBIDDEN", {
          message: "Tu ne peux pas modifier cette collection.",
        });
      }

      const recipe = await prisma.recipe.findFirst({
        where: {
          id: input.recipeId,
          ...accessWhereForViewer(appUser.id),
        },
        select: { id: true },
      });

      if (!recipe) {
        throw new ORPCError("NOT_FOUND", {
          message: "Recette introuvable ou inaccessible.",
        });
      }

      await prisma.collectionRecipe.upsert({
        where: {
          collectionId_recipeId: {
            collectionId: input.collectionId,
            recipeId: input.recipeId,
          },
        },
        create: {
          collectionId: input.collectionId,
          recipeId: input.recipeId,
        },
        update: {},
      });

      return { success: true };
    }),
};

export default collectionRouter;
