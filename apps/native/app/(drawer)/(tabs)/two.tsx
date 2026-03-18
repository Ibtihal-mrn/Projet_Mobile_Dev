import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Input, Spinner, TextField } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export default function AmisScreen() {
  const { data: session } = authClient.useSession();
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const pendingRequestsQuery = useQuery({
    ...orpc.user.pendingRequests.queryOptions(),
    enabled: Boolean(session?.user),
  });
  const friendsQuery = useQuery({
    ...orpc.user.friends.queryOptions(),
    enabled: Boolean(session?.user),
  });

  const searchQuery = useQuery({
    ...orpc.user.search.queryOptions({ input: { query } }),
    enabled: Boolean(session?.user) && query.trim().length > 0,
  });

  const sendFriendRequest = useMutation(
    orpc.user.sendFriendRequest.mutationOptions({
      onSuccess: async () => {
        setActionError(null);
        await queryClient.invalidateQueries();
      },
      onError: (error) => {
        setActionError(error.message || "Impossible d'envoyer la demande d'ami.");
      },
    }),
  );

  const respondToRequest = useMutation(
    orpc.user.respondToFriendRequest.mutationOptions({
      onSuccess: async () => {
        setActionError(null);
        await queryClient.invalidateQueries();
      },
      onError: (error) => {
        setActionError(error.message || "Impossible de traiter la demande d'ami.");
      },
    }),
  );

  function submitSearch() {
    const trimmed = searchInput.trim();
    if (trimmed) setQuery(trimmed);
  }

  if (!session?.user) {
    return (
      <Container className="p-6">
        <View className="gap-4 pb-8">
          <Text className="text-3xl font-semibold text-foreground">Amis</Text>
          <Text className="text-sm text-muted-foreground">
            Connecte-toi pour rechercher des utilisateurs.
          </Text>
          <SignIn />
          <SignUp />
        </View>
      </Container>
    );
  }

  return (
    <Container className="p-6">
      <View className="gap-4 pb-8">
        <Text className="text-3xl font-semibold text-foreground">Amis</Text>
        <Text className="text-sm text-muted-foreground">Gère tes demandes d'amis et cherche des profils.</Text>

        {actionError ? <Text className="text-sm text-danger">{actionError}</Text> : null}

        <View className="gap-2 rounded-xl bg-secondary p-4">
          <Text className="text-base font-semibold text-foreground">Demandes reçues</Text>

          {pendingRequestsQuery.isLoading ? (
            <View className="items-center py-2">
              <Spinner size="sm" color="default" />
            </View>
          ) : null}

          {pendingRequestsQuery.data?.length === 0 ? (
            <Text className="text-sm text-muted-foreground">Aucune demande en attente.</Text>
          ) : null}

          {pendingRequestsQuery.data?.map((request) => {
            const isPending =
              respondToRequest.isPending && respondToRequest.variables?.requestId === request.requestId;

            return (
              <View key={request.requestId} className="flex-row items-center justify-between gap-3">
                <Text className="text-sm text-foreground">{request.username}</Text>

                <View className="flex-row gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onPress={() =>
                      respondToRequest.mutate({
                        requestId: request.requestId,
                        action: "accept",
                      })
                    }
                    isDisabled={isPending}
                  >
                    <Button.Label>Accepter</Button.Label>
                  </Button>

                  <Button
                    size="sm"
                    variant="danger-soft"
                    onPress={() =>
                      respondToRequest.mutate({
                        requestId: request.requestId,
                        action: "reject",
                      })
                    }
                    isDisabled={isPending}
                  >
                    <Button.Label>Refuser</Button.Label>
                  </Button>
                </View>
              </View>
            );
          })}
        </View>

        <View className="gap-2 rounded-xl bg-secondary p-4">
          <Text className="text-base font-semibold text-foreground">Mes amis</Text>

          {friendsQuery.isLoading ? (
            <View className="items-center py-2">
              <Spinner size="sm" color="default" />
            </View>
          ) : null}

          {friendsQuery.data?.length === 0 ? (
            <Text className="text-sm text-muted-foreground">Tu n'as pas encore d'amis.</Text>
          ) : null}

          {friendsQuery.data?.map((friend) => (
            <Text key={friend.id} className="text-sm text-foreground">
              {friend.username}
            </Text>
          ))}
        </View>

        <Text className="text-sm text-muted-foreground">Cherche un utilisateur pour lui envoyer une demande.</Text>

        {/* Barre de recherche */}
        <View className="flex-row gap-2 items-end">
          <View className="flex-1">
            <TextField>
              <Input
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="Ex: alice"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={submitSearch}
                returnKeyType="search"
              />
            </TextField>
          </View>
          <Button onPress={submitSearch} className="shrink-0">
            <Button.Label>Chercher</Button.Label>
          </Button>
        </View>

        {/* Résultats */}
        {searchQuery.isLoading ? (
          <View className="items-center py-6">
            <Spinner size="lg" color="default" />
          </View>
        ) : null}

        {searchQuery.isError ? (
          <Text className="text-sm text-danger">
            {searchQuery.error instanceof Error
              ? searchQuery.error.message
              : "Erreur lors de la recherche."}
          </Text>
        ) : null}

        {searchQuery.data && searchQuery.data.length === 0 ? (
          <Text className="text-sm text-muted-foreground">Aucun utilisateur trouvé.</Text>
        ) : null}

        {searchQuery.data?.map((user) => {
          const isPending =
            sendFriendRequest.isPending && sendFriendRequest.variables?.userId === user.id;

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

          const buttonVariant = isFriend || hasOutgoingPending ? "outline" : "primary";
          const isDisabled = isPending || !canSendRequest;

          return (
            <View
              key={user.id}
              className="flex-row items-center justify-between rounded-xl bg-secondary px-4 py-3"
            >
              <Text className="text-base font-medium text-foreground">{user.username}</Text>

              <Button
                size="sm"
                variant={buttonVariant}
                onPress={() => sendFriendRequest.mutate({ userId: user.id })}
                isDisabled={isDisabled}
              >
                {isPending ? (
                  <Spinner size="sm" />
                ) : (
                  <Button.Label>{buttonLabel}</Button.Label>
                )}
              </Button>
            </View>
          );
        })}
      </View>
    </Container>
  );
}
