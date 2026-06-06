import { useQuery } from "@tanstack/react-query";
import type { ORPCUtils } from "./orpc-types";
import type { AuthUser } from "./types";


export type HomePageHookDeps = {
  orpc: ORPCUtils;
  authClient: {
    useSession: () => { data: { user?: AuthUser } | null; isPending: boolean };
  };
};

const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

export function useHomePage({ orpc, authClient }: HomePageHookDeps) {
  const { data: session, isPending } = authClient.useSession();

  const recipes = useQuery({
    ...(orpc.recipe.list.queryOptions()),
  });

  const recipesErrorMessage =
    recipes.error instanceof Error
      ? recipes.error.message
      : "Impossible de charger les recettes.";

  return {
    session,
    isPending,
    recipes,
    recipesErrorMessage,
    fallbackRecipeImage: FALLBACK_RECIPE_IMAGE,
  };
}
