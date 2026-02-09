import prisma from "@my-better-t-app/db";
import { publicProcedure } from "..";
import z from "zod";

export default {
  list: publicProcedure.handler(async () => {
    return await prisma.ingredient.findMany({});
  }),
  create: publicProcedure
    .input(z.object({ name: z.string(), unit: z.string() }))
    .handler(async ({ input }) => {
      await prisma.ingredient.create({ data: input });
    }),
};
