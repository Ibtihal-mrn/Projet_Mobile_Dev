// import prisma from "@my-better-t-app/db";
// import { publicProcedure } from "..";
// import z from "zod";

// export default {
//   list: publicProcedure.handler(async () => {
//     return await prisma.ingredient.findMany({});
//   }),
//   create: publicProcedure
//     .input(z.object({ name: z.string(), unit: z.string() }))
//     .handler(async ({ input }) => {
//       await prisma.ingredient.create({ data: input });
//     }),
// };


import prisma from "@my-better-t-app/db";
import { publicProcedure } from "..";
import z from "zod";

export default {
  list: publicProcedure.handler(async () => {
    return prisma.ingredient.findMany({ orderBy: { name: "asc" } });
  }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1).max(80) }))
    .handler(async ({ input }) => {
      const name = input.name.trim().toLowerCase();

      // évite doublons + gère le cas "déjà existant"
      return prisma.ingredient.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }),
};
