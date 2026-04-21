import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import collection from "./collection";
import ingredients from "./ingredients";
import recipe from "./recipe";
import user from "./user";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  collection,
  ingredients,
  recipe,
  user,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
