import { useQuery } from "@tanstack/react-query";
import type { AppRouterClient } from "@my-better-t-app/api/routers/index";
import type { RouterUtils } from "@orpc/tanstack-query";

export const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

export type CollectionDetailsParams = {
  id: string;
  from?: string;
  userId?: string;
};

export type CollectionDetailsOptions = {
  onNavigateBack: () => void;
  onNavigateToRecipe: (recipeId: string) => void;
};

export type CollectionDetailsHookDeps = {
  orpc: RouterUtils<AppRouterClient>;
};

type CollectionRecipe = {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  isPublic: boolean;
  authorName: string | null;
  showVisibilityBadge: boolean;
};

type CollectionDetails = {
  id: number;
  name: string;
  createdAt: Date;
  recipes: CollectionRecipe[];
};

export type CollectionDetailsStatus =
  | "invalid"
  | "loading"
  | "error"
  | "success";

export function useCollectionDetailsPage(
  { orpc }: CollectionDetailsHookDeps,
  params: CollectionDetailsParams,
  options: CollectionDetailsOptions,
) {
  const collectionId = Number(params.id);
  const hasValidId = Number.isInteger(collectionId) && collectionId > 0;

  const collectionQuery = useQuery({
    ...(orpc.collection.byId.queryOptions({
      input: { id: hasValidId ? collectionId : 1 },
    }) as any),
    enabled: hasValidId,
  } as any) as {
    data?: {
      id: number;
      name: string;
      createdAt: Date;
      recipes: CollectionRecipe[];
    };
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };

  const status: CollectionDetailsStatus = !hasValidId
    ? "invalid"
    : collectionQuery.isLoading
      ? "loading"
      : collectionQuery.isError || !collectionQuery.data
        ? "error"
        : "success";

  const errorMessage =
    status === "error"
      ? collectionQuery.error instanceof Error
        ? collectionQuery.error.message
        : "Collection introuvable."
      : null;

  return {
    status,
    errorMessage,
    collection: collectionQuery.data ?? null,
    handleBack: options.onNavigateBack,
    handleRecipePress: options.onNavigateToRecipe,
  };
}
