import prisma from "@my-better-t-app/db";
import z from "zod";
import { protectedProcedure, publicProcedure } from "..";

// Validation schemas

// Valide un ingrédient de recette, soit en référence à un ingrédient existant (ingredientId), soit en créant un nouvel ingrédient (name)
const recipeIngredientInput = z
  .object({
    ingredientId: z.number().int().positive().optional(),
    name: z.string().min(1).max(80).optional(),
    quantity: z.string().min(1).max(50).optional(),
    unit: z.string().min(1).max(30).optional(),
  })
  .refine((data) => Boolean(data.ingredientId || data.name), {
    message: "ingredientId or name is required",
  });

// Valide les données pour créer une recette
const recipeInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  imageUrl: z.string().url().max(2048).optional(),
  isPublic: z.boolean().default(true),
  prepTime: z.number().int().min(1).max(10000),
  steps: z.array(z.string().min(1).max(2000)).min(1),
  ingredients: z.array(recipeIngredientInput).min(1),
});

// Reprend les mêmes champs que recipeInput mais avec un id pour l'update
const recipeUpdateInput = recipeInput.extend({
  id: z.number().int().positive(),
});

const recipeDeleteInput = z.object({
  id: z.number().int().positive(),
});

const recipeSearchInput = z.object({
  query: z.string().trim().max(200).optional(),
  ingredients: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  prepTimeMin: z.number().int().min(1).max(10000).optional(),
  prepTimeMax: z.number().int().min(1).max(10000).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

function buildIngredientsData(
  ingredients: Array<z.infer<typeof recipeIngredientInput>>,
) {
  return ingredients.map((ingredient) => {
    if (ingredient.ingredientId) {
      return {
        ingredient: { connect: { id: ingredient.ingredientId } },
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      };
    }

    const name = ingredient.name?.trim().toLowerCase();
    if (!name) throw new Error("ingredient name is required");

    return {
      ingredient: {
        connectOrCreate: {
          where: { name },
          create: { name },
        },
      },
      quantity: ingredient.quantity,
      unit: ingredient.unit,
    };
  });
}

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

function isGenericRecipeAuthor(email?: string | null) {
  return Boolean(email?.endsWith("@example.com"));
}

async function findAppUserBySessionEmail(email?: string) {
  if (!email) {
    return null;
  }

  return prisma.appUser.findUnique({
    where: { email },
    select: { id: true },
  });
}

function accessWhereForViewer(viewerId?: number) {
  if (!viewerId) {
    return {
      isPublic: true,
    };
  }

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

export default {
  list: publicProcedure.handler(async ({ context }) => {
    const appUser = await findAppUserBySessionEmail(
      context.session?.user?.email,
    );

    const rows = await prisma.recipe.findMany({
      where: accessWhereForViewer(appUser?.id),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        isPublic: true,
        prepTime: true,
        author: { select: { username: true, email: true, passwordHash: true } },
      },
    });

    return rows.map(({ author, ...rest }) => ({
      ...rest,
      authorName: isGenericRecipeAuthor(author.email) ? null : author.username,
      showVisibilityBadge: author.passwordHash === "managed-by-better-auth",
    }));
  }),

  search: publicProcedure
    .input(recipeSearchInput)
    .handler(async ({ input, context }) => {
      const appUser = await findAppUserBySessionEmail(
        context.session?.user?.email,
      );

      const normalizedQuery = input.query?.trim();
      const normalizedIngredients = (input.ingredients ?? [])
        .map((ingredient) => ingredient.trim().toLowerCase())
        .filter(Boolean);

      const minPrepTime = input.prepTimeMin;
      const maxPrepTime = input.prepTimeMax;

      if (
        typeof minPrepTime === "number" &&
        typeof maxPrepTime === "number" &&
        minPrepTime > maxPrepTime
      ) {
        throw new Error(
          "Le temps minimum ne peut pas etre superieur au temps maximum.",
        );
      }

      const rows = await prisma.recipe.findMany({
        where: {
          ...accessWhereForViewer(appUser?.id),
          ...(normalizedQuery
            ? {
                OR: [
                  {
                    title: {
                      contains: normalizedQuery,
                      mode: "insensitive",
                    },
                  },
                  {
                    description: {
                      contains: normalizedQuery,
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {}),
          ...(normalizedIngredients.length
            ? {
                AND: normalizedIngredients.map((ingredientName) => ({
                  ingredients: {
                    some: {
                      ingredient: {
                        name: {
                          contains: ingredientName,
                          mode: "insensitive",
                        },
                      },
                    },
                  },
                })),
              }
            : {}),
          ...(typeof minPrepTime === "number" || typeof maxPrepTime === "number"
            ? {
                prepTime: {
                  ...(typeof minPrepTime === "number"
                    ? { gte: minPrepTime }
                    : {}),
                  ...(typeof maxPrepTime === "number"
                    ? { lte: maxPrepTime }
                    : {}),
                },
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          isPublic: true,
          prepTime: true,
          author: {
            select: { username: true, email: true, passwordHash: true },
          },
        },
      });

      return rows.map(({ author, ...rest }) => ({
        ...rest,
        authorName: isGenericRecipeAuthor(author.email)
          ? null
          : author.username,
        showVisibilityBadge: author.passwordHash === "managed-by-better-auth",
      }));
    }),

  // Liste uniquement les recettes créées par l'utilisateur connecté.
  mine: protectedProcedure.handler(async ({ context }) => {
    const sessionEmail = context.session?.user?.email;
    if (!sessionEmail) {
      throw new Error("Unauthorized");
    }

    const appUser = await prisma.appUser.findUnique({
      where: { email: sessionEmail },
      select: { id: true },
    });

    if (!appUser) {
      return [];
    }

    const rows = await prisma.recipe.findMany({
      where: { authorId: appUser.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        isPublic: true,
        prepTime: true,
        author: { select: { username: true, email: true, passwordHash: true } },
      },
    });

    return rows.map(({ author, ...rest }) => ({
      ...rest,
      authorName: isGenericRecipeAuthor(author.email) ? null : author.username,
      showVisibilityBadge: author.passwordHash === "managed-by-better-auth",
    }));
  }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .handler(async ({ input, context }) => {
      const appUser = await findAppUserBySessionEmail(
        context.session?.user?.email,
      );

      const recipe = await prisma.recipe.findFirst({
        where: {
          id: input.id,
          ...accessWhereForViewer(appUser?.id),
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              email: true,
              passwordHash: true,
            },
          },
          steps: { orderBy: { stepOrder: "asc" } },
          ingredients: {
            include: { ingredient: true },
          },
        },
      });

      if (!recipe) {
        return null;
      }

      const showVisibilityBadge =
        recipe.author.passwordHash === "managed-by-better-auth";
      const { passwordHash: _passwordHash, ...safeAuthor } = recipe.author;

      return {
        ...recipe,
        author: safeAuthor,
        authorName: isGenericRecipeAuthor(recipe.author.email)
          ? null
          : recipe.author.username,
        isOwner: appUser?.id === recipe.authorId,
        showVisibilityBadge,
      };
    }),

  create: protectedProcedure
    .input(recipeInput)
    .handler(async ({ input, context }) => {
      const sessionUser = context.session?.user;
      if (!sessionUser?.email) throw new Error("Unauthorized");

      const email = sessionUser.email;
      const baseUsername = baseUsernameFromEmail(email);

      // 1) Trouver l'AppUser par email
      let appUser = await prisma.appUser.findUnique({ where: { email } });

      // 2) Si pas trouvé, le créer avec username unique
      if (!appUser) {
        let username = baseUsername;

        // collision check
        const existing = await prisma.appUser.findUnique({
          where: { username },
        });
        if (existing) {
          username = `${baseUsername}_${Math.floor(Math.random() * 10000)}`;
        }

        appUser = await prisma.appUser.create({
          data: {
            email,
            username,
            passwordHash: "managed-by-better-auth",
          },
        });
      }

      const authorId = appUser.id;

      const ingredientsData = buildIngredientsData(input.ingredients);

      return prisma.recipe.create({
        data: {
          title: input.title,
          description: input.description,
          imageUrl: input.imageUrl,
          isPublic: input.isPublic,
          prepTime: input.prepTime,
          authorId,
          steps: {
            create: input.steps.map((content, index) => ({
              content,
              stepOrder: index + 1,
            })),
          },
          ingredients: { create: ingredientsData },
        },
        include: {
          author: { select: { id: true, username: true } },
          steps: { orderBy: { stepOrder: "asc" } },
          ingredients: { include: { ingredient: true } },
        },
      });
    }),

  // L'update d'une recette est protégé et vérifie que l'utilisateur connecté est le propriétaire de la recette
  update: protectedProcedure
    .input(recipeUpdateInput)
    // Vérifie que l'utilisateur connecté est le propriétaire de la recette avant de permettre la mise à jour
    .handler(async ({ input, context }) => {
      const sessionEmail = context.session?.user?.email;
      if (!sessionEmail) {
        throw new Error("Unauthorized");
      }

      // Récupère l'AppUser de l'utilisateur connecté
      const appUser = await prisma.appUser.findUnique({
        where: { email: sessionEmail },
        select: { id: true },
      });

      if (!appUser) {
        throw new Error("Unauthorized");
      }

      // Récupère la recette à mettre à jour
      const existingRecipe = await prisma.recipe.findUnique({
        where: { id: input.id },
        select: { id: true, authorId: true },
      });

      if (!existingRecipe) {
        throw new Error("Recipe not found");
      }

      if (existingRecipe.authorId !== appUser.id) {
        throw new Error("Forbidden");
      }

      const ingredientsData = buildIngredientsData(input.ingredients);

      return prisma.$transaction(async (tx) => {
        await tx.recipeStep.deleteMany({
          where: { recipeId: input.id },
        });

        await tx.recipeIngredient.deleteMany({
          where: { recipeId: input.id },
        });

        return tx.recipe.update({
          where: { id: input.id },
          data: {
            title: input.title,
            description: input.description,
            imageUrl: input.imageUrl,
            isPublic: input.isPublic,
            prepTime: input.prepTime,
            steps: {
              create: input.steps.map((content, index) => ({
                content,
                stepOrder: index + 1,
              })),
            },
            ingredients: {
              create: ingredientsData,
            },
          },
          include: {
            author: { select: { id: true, username: true } },
            steps: { orderBy: { stepOrder: "asc" } },
            ingredients: { include: { ingredient: true } },
          },
        });
      });
    }),

  delete: protectedProcedure
    .input(recipeDeleteInput)
    .handler(async ({ input, context }) => {
      const sessionEmail = context.session?.user?.email;
      if (!sessionEmail) {
        throw new Error("Unauthorized");
      }

      const appUser = await prisma.appUser.findUnique({
        where: { email: sessionEmail },
        select: { id: true },
      });

      if (!appUser) {
        throw new Error("Unauthorized");
      }

      const existingRecipe = await prisma.recipe.findUnique({
        where: { id: input.id },
        select: { id: true, authorId: true },
      });

      if (!existingRecipe) {
        throw new Error("Recipe not found");
      }

      if (existingRecipe.authorId !== appUser.id) {
        throw new Error("Forbidden");
      }

      return prisma.$transaction(async (tx) => {
        await tx.recipeStep.deleteMany({
          where: { recipeId: input.id },
        });

        await tx.recipeIngredient.deleteMany({
          where: { recipeId: input.id },
        });

        await tx.collectionRecipe.deleteMany({
          where: { recipeId: input.id },
        });

        await tx.favoriteRecipe.deleteMany({
          where: { recipeId: input.id },
        });

        const deletedRecipe = await tx.recipe.delete({
          where: { id: input.id },
          select: { id: true },
        });

        return {
          id: deletedRecipe.id,
        };
      });
    }),
};
