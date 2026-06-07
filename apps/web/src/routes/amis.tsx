import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { useQueryClient } from "@tanstack/react-query";
import { useAmis } from "@my-app/hooks";

export const Route = createFileRoute("/amis")({
  component: AmisPage,
});

function AmisPage() {
  const queryClient = useQueryClient();
  const {
    session,
    searchInput,
    setSearchInput,
    actionError,
    pendingRequestsQuery,
    friendsQuery,
    searchQuery,
    sendFriendRequest,
    respondToRequest,
    removeFriend,
    submitSearch,
  } = useAmis({ orpc, authClient, queryClient });

  if (!session?.user) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <h1 className="text-3xl font-semibold">Amis</h1>
        <p className="text-sm text-muted-foreground">
          Connecte-toi pour rechercher des utilisateurs.
        </p>
        <Link to="/login" className="underline text-sm">Se connecter</Link>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-3xl font-semibold">Amis</h1>

      {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}

      {/* Barre de recherche */}
      <div className="flex gap-2 items-end">
        <input
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Ex: alice"
          autoCapitalize="none"
          autoCorrect="off"
          onKeyDown={(e) => e.key === "Enter" && submitSearch()}
        />
        <button
          onClick={submitSearch}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
        >
          Chercher
        </button>
      </div>

      {/* Résultats recherche */}
      {searchQuery.isLoading ? <p className="text-sm text-muted-foreground">Recherche...</p> : null}

      {searchQuery.isError ? (
        <p className="text-sm text-red-500">
          {searchQuery.error instanceof Error ? searchQuery.error.message : "Erreur lors de la recherche."}
        </p>
      ) : null}

      {Array.isArray(searchQuery.data) && searchQuery.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun utilisateur trouvé.</p>
      ) : null}

      {(Array.isArray(searchQuery.data) ? searchQuery.data : []).map((user: any) => {
        const isPending = sendFriendRequest.isPending && (sendFriendRequest.variables)?.userId === user.id;
        const isFriend = user.relationStatus === "friend";
        const hasOutgoingPending = user.relationStatus === "outgoing_pending";
        const hasIncomingPending = user.relationStatus === "incoming_pending";
        const canSendRequest = user.relationStatus === "none";
        const buttonLabel = isFriend
          ? "Déjà ami"
          : hasOutgoingPending
            ? "Demande envoyée"
            : hasIncomingPending
              ? "Demande reçue"
              : "Ajouter";

        return (
          <div key={user.id} className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-3">
            <Link to="/users/$id" params={{ id: String(user.id) }} className="flex flex-1 items-center gap-3">
              <img src={user.avatarUrl} className="h-11 w-11 rounded-full bg-background object-cover" />
              <div className="flex-1">
                <p className="text-base font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground">Voir le profil</p>
              </div>
            </Link>
            <button
              onClick={() => sendFriendRequest.mutate({ userId: user.id })}
              disabled={isPending || !canSendRequest}
              className="px-3 py-1 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
            >
              {isPending ? "..." : buttonLabel}
            </button>
          </div>
        );
      })}

      {/* Demandes reçues */}
      <div className="flex flex-col gap-2 rounded-xl bg-secondary p-4">
        <h2 className="text-base font-semibold">Demandes reçues</h2>
        {pendingRequestsQuery.isLoading ? <p className="text-sm text-muted-foreground">Chargement...</p> : null}
        {Array.isArray(pendingRequestsQuery.data) && pendingRequestsQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
        ) : null}
        {(Array.isArray(pendingRequestsQuery.data) ? pendingRequestsQuery.data : []).map((request: any) => {
          const isPending = respondToRequest.isPending && (respondToRequest.variables)?.requestId === request.requestId;
          return (
            <div key={request.requestId} className="flex items-center justify-between gap-3">
              <p className="text-sm">{request.username}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => respondToRequest.mutate({ requestId: request.requestId, action: "accept" })}
                  disabled={isPending}
                  className="px-3 py-1 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                >
                  Accepter
                </button>
                <button
                  onClick={() => respondToRequest.mutate({ requestId: request.requestId, action: "reject" })}
                  disabled={isPending}
                  className="px-3 py-1 text-sm rounded-lg bg-destructive text-destructive-foreground disabled:opacity-50"
                >
                  Refuser
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mes amis */}
      <div className="flex flex-col gap-2 rounded-xl bg-secondary p-4">
        <h2 className="text-base font-semibold">Mes amis</h2>
        {friendsQuery.isLoading ? <p className="text-sm text-muted-foreground">Chargement...</p> : null}
        {Array.isArray(friendsQuery.data) && friendsQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tu n'as pas encore d'amis.</p>
        ) : null}
        {(Array.isArray(friendsQuery.data) ? friendsQuery.data : []).map((friend: any) => {
          const isRemoving =
            removeFriend.isPending && (removeFriend.variables)?.userId === friend.id;

          return (
            <div key={friend.id} className="flex items-center gap-3 rounded-xl bg-background px-4 py-3">
              <Link to="/users/$id" params={{ id: String(friend.id) }} className="flex flex-1 items-center gap-3">
                <img src={friend.avatarUrl} className="h-11 w-11 rounded-full bg-secondary object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{friend.username}</p>
                  <p className="text-xs text-muted-foreground">Ouvrir le profil</p>
                </div>
              </Link>
              <button
                onClick={() => removeFriend.mutate({ userId: friend.id })}
                disabled={isRemoving}
                className="px-3 py-1 text-sm rounded-lg bg-destructive text-destructive-foreground disabled:opacity-50"
              >
                {isRemoving ? "..." : "Supprimer"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}