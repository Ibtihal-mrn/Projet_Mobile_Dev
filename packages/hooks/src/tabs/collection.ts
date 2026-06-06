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
      onSuccess: async () => {
        setActionError(null);
        setNewCollectionName("");
        await queryClient.invalidateQueries({
          queryKey: orpc.collection.listMine.queryKey(),
        });
      },
      onError: (error: any) => {
        setActionError(error?.message || "Impossible de creer la collection.");
      },
    }));

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
