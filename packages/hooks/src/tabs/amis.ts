import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { AppRouterClient } from "@my-better-t-app/api/routers/index";
import type { RouterUtils } from "@orpc/tanstack-query";

export type AmisHookDeps = {
  orpc: RouterUtils<AppRouterClient>;
  authClient: {
    useSession: () => { data: { user?: unknown } | null; isPending: boolean };
  };
  queryClient: QueryClient;
};

export function useAmis({ orpc, authClient, queryClient }: AmisHookDeps) {
  const { data: session, isPending } = authClient.useSession();
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const pendingRequestsQuery = useQuery({
    ...orpc.user.pendingRequests.queryOptions(),
    enabled: Boolean(session?.user) && !isPending,
  } as unknown as Parameters<typeof useQuery>[0]);

  const friendsQuery = useQuery({
    ...orpc.user.friends.queryOptions(),
    enabled: Boolean(session?.user) && !isPending,
  } as unknown as Parameters<typeof useQuery>[0]);

  const searchQuery = useQuery({
    ...orpc.user.search.queryOptions({ input: { query } }),
    enabled: Boolean(session?.user) && query.trim().length > 0 && !isPending,
  } as unknown as Parameters<typeof useQuery>[0]);

  const sendFriendRequest = useMutation(
    orpc.user.sendFriendRequest.mutationOptions({
      onSuccess: async () => {
        setActionError(null);
        await queryClient.invalidateQueries();
      },
      onError: (error: Error) => {
        setActionError(
          error.message || "Impossible d'envoyer la demande d'ami.",
        );
      },
    }) as unknown as Parameters<typeof useMutation>[0],
  );

  const respondToRequest = useMutation(
    orpc.user.respondToFriendRequest.mutationOptions({
      onSuccess: async () => {
        setActionError(null);
        await queryClient.invalidateQueries();
      },
      onError: (error: Error) => {
        setActionError(
          error.message || "Impossible de traiter la demande d'ami.",
        );
      },
    }) as unknown as Parameters<typeof useMutation>[0],
  );

  function submitSearch() {
    const trimmed = searchInput.trim();
    if (trimmed) setQuery(trimmed);
  }

  return {
    session,
    isPending,
    query,
    searchInput,
    setSearchInput,
    actionError,
    pendingRequestsQuery,
    friendsQuery,
    searchQuery,
    sendFriendRequest,
    respondToRequest,
    submitSearch,
  };
}
