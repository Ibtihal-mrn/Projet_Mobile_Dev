import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { QueryClient, UseQueryResult } from "@tanstack/react-query";
import type { ORPCUtils } from "../orpc-types";

type CollectionRecipe = {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  isPublic: boolean;
  prepTime: number;
  authorName: string | null;
  showVisibilityBadge: boolean;
};

type CollectionDetails = {
  id: number;
  name: string;
  recipes: CollectionRecipe[];
};

export type CollectionDetailsHookDeps = {
  orpc: ORPCUtils;
  collectionId: string;
  onNavigateBack?: () => void;
  onNavigateToRecipe?: (recipeId: string) => void;
  queryClient?: QueryClient;
};

const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

export function useCollectionDetailsPage({
  orpc,
  collectionId,
  onNavigateBack,
  onNavigateToRecipe,
}: CollectionDetailsHookDeps) {
  const parsedId = Number(collectionId);
  const hasValidId = Number.isInteger(parsedId) && parsedId > 0;

  const collectionQuery = useQuery({
    ...(orpc.collection.byId.queryOptions({
      input: { id: hasValidId ? parsedId : 1 },
    }) as any),
    enabled: hasValidId,
  } as any) as UseQueryResult<CollectionDetails, Error>;

  const collection = collectionQuery.data ?? null;

  const status = !hasValidId
    ? "invalid"
    : collectionQuery.isLoading
      ? "loading"
      : collectionQuery.isError || !collection
        ? "error"
        : "success";

  const errorMessage = useMemo(() => {
    if (!hasValidId) {
      return "ID de collection invalide.";
    }

    if (collectionQuery.isError) {
      return collectionQuery.error instanceof Error
        ? collectionQuery.error.message
        : "Impossible de charger la collection.";
    }

    if (!collectionQuery.isLoading && !collection) {
      return "Collection introuvable.";
    }

    return null;
  }, [
    collection,
    collectionQuery.error,
    collectionQuery.isError,
    collectionQuery.isLoading,
    hasValidId,
  ]);

  function handleBack() {
    onNavigateBack?.();
  }

  function handleRecipePress(recipeId: string) {
    onNavigateToRecipe?.(recipeId);
  }

  return {
    status,
    errorMessage,
    collection,
    collectionQuery,
    hasValidId,
    fallbackRecipeImage: FALLBACK_RECIPE_IMAGE,
    handleBack,
    handleRecipePress,
  };
}
