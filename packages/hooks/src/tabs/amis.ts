import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { AppRouterClient } from "@my-better-t-app/api/routers/index";
import type { RouterUtils } from "@orpc/tanstack-query";
import type { AuthUser, SearchUser, PendingRequest, Friend } from "../types";

export type ORPCClient = AppRouterClient;
export type ORPCUtils = RouterUtils<ORPCClient>;

export type AmisHookDeps = {
  orpc: ORPCUtils;
  authClient: {
    useSession: () => { data: { user?: AuthUser } | null; isPending: boolean };
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
  } as unknown as Parameters<typeof useQuery>[0]) as {
    data?: PendingRequest[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };

  const friendsQuery = useQuery({
    ...orpc.user.friends.queryOptions(),
    enabled: Boolean(session?.user) && !isPending,
  } as unknown as Parameters<typeof useQuery>[0]) as {
    data?: Friend[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };

  const searchQuery = useQuery({
    ...orpc.user.search.queryOptions({ input: { query } }),
    enabled: Boolean(session?.user) && query.trim().length > 0 && !isPending,
  } as unknown as Parameters<typeof useQuery>[0]) as {
    data?: SearchUser[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
  };

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
      ) as {
        mutate: (variables: { userId: number }) => void;
        isPending: boolean;
        variables?: { userId: number };
      };

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
    ) as {
      mutate: (variables: { requestId: number; action: "accept" | "reject" }) => void;
      isPending: boolean;
      variables?: { requestId: number };
    };

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
