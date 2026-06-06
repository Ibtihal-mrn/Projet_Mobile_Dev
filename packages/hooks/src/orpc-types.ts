import type { AppRouterClient } from "@my-better-t-app/api/routers/index";
import type { RouterUtils } from "@orpc/tanstack-query";

export type ORPCClient = AppRouterClient;
export type ORPCUtils = RouterUtils<ORPCClient>;

export default {} as const;
