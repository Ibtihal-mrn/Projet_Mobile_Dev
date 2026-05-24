import { useQuery } from "@tanstack/react-query";
import type { AppRouterClient } from "@my-better-t-app/api/routers/index";
import type { RouterUtils } from "@orpc/tanstack-query";

type HomeRecipe = {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  isPublic: boolean;
  prepTime: number;
  authorName: string | null;
  showVisibilityBadge: boolean;
};

export type HomePageHookDeps = {
  orpc: RouterUtils<AppRouterClient>;
  authClient: {
    useSession: () => { data: { user?: unknown } | null };
  };
};

const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

export function useHomePage({ orpc, authClient }: HomePageHookDeps) {
  const { data: session } = authClient.useSession();

  const recipes = useQuery({
    ...(orpc.recipe.list.queryOptions() as any),
  } as any) as {
    data?: HomeRecipe[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };

  const recipesErrorMessage =
    recipes.error instanceof Error
      ? recipes.error.message
      : "Impossible de charger les recettes.";

  return {
    session,
    recipes,
    recipesErrorMessage,
    fallbackRecipeImage: FALLBACK_RECIPE_IMAGE,
  };
}
