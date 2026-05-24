import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { AppRouterClient } from "@my-better-t-app/api/routers/index";
import type { RouterUtils } from "@orpc/tanstack-query";

type CollectionSummary = {
    id: number;
    name: string;
    createdAt: Date;
    recipesCount: number;
    imageUrls: Array<string | null>;
    hasRecipe: boolean;
};

export type CollectionHookDeps = {
  orpc: RouterUtils<AppRouterClient>;
  authClient: {
    useSession: () => { data: { user?: unknown } | null };
  };
  queryClient: QueryClient;
};

const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

export function useCollectionPage({ orpc, authClient, queryClient }: CollectionHookDeps) {

    const { data: session } = authClient.useSession();
    const [actionError, setActionError] = useState<string | null>(null);
    const [newCollectionName, setNewCollectionName] = useState("");

    const collectionsQuery = useQuery({
        ...(orpc.collection.listMine.queryOptions() as any),
        enabled: Boolean(session?.user),
    } as any) as {
      data?: CollectionSummary[];
      isLoading: boolean;
      isError: boolean;
      error: unknown;
    };

    const createCollectionMutation = useMutation(
        orpc.collection.create.mutationOptions({
        onSuccess: async () => {
            setActionError(null);
            setNewCollectionName("");
            await queryClient.invalidateQueries({
            queryKey: orpc.collection.listMine.queryKey(),
            });
        },
        onError: (error) => {
            setActionError(error.message || "Impossible de creer la collection.");
        },
        }) as unknown as Parameters<typeof useMutation>[0],
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
    };

    return {
        session,
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