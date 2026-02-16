import prisma from "@my-better-t-app/db";
import z from "zod";
import { protectedProcedure } from "..";

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
  prepTime: z.number().int().min(1).max(10000),
  steps: z.array(z.string().min(1).max(2000)).min(1),
  ingredients: z.array(recipeIngredientInput).min(1),
});

function baseUsernameFromEmail(email: string) {
  const base = email.split("@")[0] ?? "user";
  return base.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20) || "user";
}

export default {
  create: protectedProcedure.input(recipeInput).handler(async ({ input, context }) => {
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
      const existing = await prisma.appUser.findUnique({ where: { username } });
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

    const ingredientsData = input.ingredients.map((ingredient) => {
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

    return prisma.recipe.create({
      data: {
        title: input.title,
        description: input.description,
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
};
