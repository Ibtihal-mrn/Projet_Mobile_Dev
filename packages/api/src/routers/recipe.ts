import prisma from "@my-better-t-app/db";
import z from "zod";
import { protectedProcedure, publicProcedure } from "..";

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

const recipeInput = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  imageUrl: z.string().url().max(2048).optional(),
  prepTime: z.number().int().min(1).max(10000),
  steps: z.array(z.string().min(1).max(2000)).min(1),
  ingredients: z.array(recipeIngredientInput).min(1),
});

const recipeUpdateInput = recipeInput.extend({
  id: z.number().int().positive(),
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

export default {
  list: publicProcedure.handler(async () => {
    return prisma.recipe.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        prepTime: true,
      },
    });
  }),

  byId: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .handler(async ({ input, context }) => {
      const recipe = await prisma.recipe.findUnique({
        where: { id: input.id },
        include: {
          author: { select: { id: true, username: true } },
          steps: { orderBy: { stepOrder: "asc" } },
          ingredients: {
            include: { ingredient: true },
          },
        },
      });

      if (!recipe) {
        return null;
      }

      const sessionEmail = context.session?.user?.email;

      if (!sessionEmail) {
        return {
          ...recipe,
          isOwner: false,
        };
      }

      const appUser = await prisma.appUser.findUnique({
        where: { email: sessionEmail },
        select: { id: true },
      });

      return {
        ...recipe,
        isOwner: appUser?.id === recipe.authorId,
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

  update: protectedProcedure
    .input(recipeUpdateInput)
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
};
