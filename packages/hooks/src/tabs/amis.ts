import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { AppRouterClient } from "@my-better-t-app/api/routers/index";
import type { RouterUtils } from "@orpc/tanstack-query";
import type { AuthUser} from "../types";

export type ORPCClient = AppRouterClient;
export type ORPCUtils = RouterUtils<ORPCClient>;

function avatarUrlFromUsername(username: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0f766e&color=ffffff&size=256&bold=true&format=png`;
}


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
  });

  const friendsQuery = useQuery({
    ...orpc.user.friends.queryOptions(),
    enabled: Boolean(session?.user) && !isPending,
  });

  const searchQuery = useQuery({
    ...orpc.user.search.queryOptions({ input: { query } }),
    enabled: Boolean(session?.user) && query.trim().length > 0 && !isPending,
  });

  const sendFriendRequest = useMutation(
    orpc.user.sendFriendRequest.mutationOptions({
      onMutate: async (variables) => {
        type SearchData = NonNullable<typeof searchQuery.data>;
        const searchKey = orpc.user.search.queryKey({ input: { query } });

        // 1. on stoppe les refetch en cours pour qu'ils n'écrasent pas notre update
        await queryClient.cancelQueries({ queryKey: searchKey });

        // 2. snapshot de l'état actuel (pour rollback si erreur)
        const previousSearch = queryClient.getQueryData<SearchData>(searchKey);

        // 3. update optimiste : le user passe en "demande envoyée" tout de suite
        queryClient.setQueryData<SearchData>(searchKey, (old) => {
          if (!old) return old;
          return old.map((user) =>
            user.id === variables.userId
              ? { ...user, relationStatus: "outgoing_pending" as const }
              : user,
          );
        });

        // 4. on transmet le snapshot + la clé à onError / onSettled
        return { previousSearch, searchKey };
      },
      onSuccess: () => {
        setActionError(null);
      },
      onError: (error: Error, _variables, context) => {
        // rollback : on remet l'ancien état
        if (context) {
          queryClient.setQueryData(context.searchKey, context.previousSearch);
        }
        setActionError(error.message || "Impossible d'envoyer la demande d'ami.");
      },
      onSettled: (_data, _error, _variables, context) => {
        // resync avec le serveur quoi qu'il arrive
        if (context) {
          queryClient.invalidateQueries({ queryKey: context.searchKey });
        }
      },
    }),
  );

  const respondToRequest = useMutation(
    orpc.user.respondToFriendRequest.mutationOptions({
      onMutate: async (variables) => {
        type PendingData = NonNullable<typeof pendingRequestsQuery.data>;
        type FriendsData = NonNullable<typeof friendsQuery.data>;

        const pendingKey = orpc.user.pendingRequests.queryKey();
        const friendsKey = orpc.user.friends.queryKey();

        // 1. stopper les refetch en cours sur les deux listes
        await Promise.all([
          queryClient.cancelQueries({ queryKey: pendingKey }),
          queryClient.cancelQueries({ queryKey: friendsKey }),
        ]);

        // 2. snapshots pour rollback
        const previousPending = queryClient.getQueryData<PendingData>(pendingKey);
        const previousFriends = queryClient.getQueryData<FriendsData>(friendsKey);

        // on récupère la demande visée AVANT de la retirer (on a besoin du username)
        const respondedRequest = previousPending?.find(
          (r) => r.requestId === variables.requestId,
        );

        // 3a. dans tous les cas : retirer la demande de "pendingRequests"
        queryClient.setQueryData<PendingData>(pendingKey, (old) =>
          old ? old.filter((r) => r.requestId !== variables.requestId) : old,
        );

        // 3b. si accept : ajouter la personne à "friends"
        if (variables.action === "accept" && respondedRequest) {
          queryClient.setQueryData<FriendsData>(friendsKey, (old) => {
            if (!old) return old;
            if (old.some((f) => f.id === respondedRequest.senderId)) return old;
            const newFriend = {
              id: respondedRequest.senderId,
              username: respondedRequest.username,
              avatarUrl: avatarUrlFromUsername(respondedRequest.username),
            };
            return [...old, newFriend].sort((a, b) =>
              a.username.localeCompare(b.username),
            );
          });
        }

        // 4. transmettre snapshots + clés à onError / onSettled
        return { previousPending, previousFriends, pendingKey, friendsKey };
      },
      onSuccess: () => {
        setActionError(null);
      },
      onError: (error: Error, _variables, context) => {
        // rollback des DEUX listes
        if (context) {
          queryClient.setQueryData(context.pendingKey, context.previousPending);
          queryClient.setQueryData(context.friendsKey, context.previousFriends);
        }
        setActionError(error.message || "Impossible de traiter la demande d'ami.");
      },
      onSettled: (_data, _error, _variables, context) => {
        // resync serveur des deux listes
        if (context) {
          queryClient.invalidateQueries({ queryKey: context.pendingKey });
          queryClient.invalidateQueries({ queryKey: context.friendsKey });
        }
      },
    }),
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
