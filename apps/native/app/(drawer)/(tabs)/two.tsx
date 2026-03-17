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

  const searchQuery = useQuery({
    ...orpc.user.search.queryOptions({ input: { query } }),
    enabled: query.trim().length > 0,
  });

  const follow = useMutation(
    orpc.user.follow.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(orpc.user.search.queryOptions({ input: { query } })),
    }),
  );

  const unfollow = useMutation(
    orpc.user.unfollow.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries(orpc.user.search.queryOptions({ input: { query } })),
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
        <Text className="text-sm text-muted-foreground">
          Cherche un utilisateur par son nom d'utilisateur.
        </Text>

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
            (follow.isPending && follow.variables?.userId === user.id) ||
            (unfollow.isPending && unfollow.variables?.userId === user.id);

          return (
            <View
              key={user.id}
              className="flex-row items-center justify-between rounded-xl bg-secondary px-4 py-3"
            >
              <Text className="text-base font-medium text-foreground">{user.username}</Text>

              <Button
                size="sm"
                variant={user.isFollowing ? "outline" : "primary"}
                onPress={() =>
                  user.isFollowing
                    ? unfollow.mutate({ userId: user.id })
                    : follow.mutate({ userId: user.id })
                }
                isDisabled={isPending}
              >
                {isPending ? (
                  <Spinner size="sm" />
                ) : (
                  <Button.Label>{user.isFollowing ? "Suivi ✓" : "Suivre"}</Button.Label>
                )}
              </Button>
            </View>
          );
        })}
      </View>
    </Container>
  );
}
