import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { ORPCUtils } from "../orpc-types";
import type { AuthUser } from "../types";



export type CollectionHookDeps = {
  orpc: ORPCUtils;
  authClient: {
    useSession: () => { data: { user?: AuthUser } | null; isPending: boolean };
  };
  queryClient: QueryClient;
};

const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

export function useCollectionPage({
  orpc,
  authClient,
  queryClient,
}: CollectionHookDeps) {
  const { data: session, isPending } = authClient.useSession();
  const [actionError, setActionError] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState("");

  const collectionsQuery = useQuery({
    ...(orpc.collection.listMine.queryOptions()),
    enabled: Boolean(session?.user) && !isPending,
  });

  const createCollectionMutation = useMutation(
  orpc.collection.create.mutationOptions({
    onMutate: async (variables: { name: string }) => {
      setActionError(null);
      const listKey = orpc.collection.listMine.queryKey();
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData(listKey);

      // insertion optimiste d'une collection temporaire
      queryClient.setQueryData(listKey, (old: any) => {
        const optimistic = {
          id: -Date.now(),                  // id temporaire négatif
          name: variables.name,
          createdAt: new Date().toISOString(),
          recipesCount: 0,
          imageUrls: [],
          hasRecipe: false,
        };
        return Array.isArray(old) ? [optimistic, ...old] : [optimistic];
      });

      setNewCollectionName("");
      return { previous, listKey };
    },
    onError: (error: any, _vars, context: any) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(context.listKey, context.previous); // rollback
      }
      setActionError(error?.message || "Impossible de creer la collection.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: orpc.collection.listMine.queryKey() });
    },
  }),
);

  const collectionsErrorMessage = useMemo(() => {
    if (!collectionsQuery.isError) {
      return null;
    }

    return collectionsQuery.error instanceof Error
      ? collectionsQuery.error.message
      : "Impossible de charger les collections.";
  }, [collectionsQuery.error, collectionsQuery.isError]);

  function createCollection() {
    const trimmed = newCollectionName.trim();
    if (!trimmed) {
      setActionError("Le nom de la collection est obligatoire.");
      return;
    }

    createCollectionMutation.mutate({ name: trimmed });
  }

  return {
    session,
    isPending,
    collectionsQuery,
    collectionsErrorMessage,
    actionError,
    newCollectionName,
    setNewCollectionName,
    createCollection,
    createCollectionMutation,
    fallbackRecipeImage: FALLBACK_RECIPE_IMAGE,
  };
}
