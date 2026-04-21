import { Link } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Input, Spinner, TextField } from "heroui-native";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

export default function CollectionsScreen() {
  const { data: session } = authClient.useSession();
  const [newCollectionName, setNewCollectionName] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const collectionsQuery = useQuery({
    ...orpc.collection.listMine.queryOptions(),
    enabled: Boolean(session?.user),
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
      onError: (error) => {
        setActionError(error.message || "Impossible de creer la collection.");
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

  if (!session?.user) {
    return (
      <Container className="p-6">
        <View className="gap-4 pb-8">
          <Text className="text-3xl font-semibold text-foreground">Collections</Text>
          <Text className="text-sm text-muted-foreground">
            Connecte-toi pour creer et organiser tes collections de recettes.
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
        <Text className="text-3xl font-semibold text-foreground">Collections</Text>
        <Text className="text-sm text-muted-foreground">
          Cree des collections comme sur Pinterest et range tes recettes preferees.
        </Text>

        {actionError ? <Text className="text-sm text-danger">{actionError}</Text> : null}

        <View className="gap-2 rounded-xl bg-secondary p-4">
          <Text className="text-base font-semibold text-foreground">Nouvelle collection</Text>
          <TextField>
            <Input
              value={newCollectionName}
              onChangeText={setNewCollectionName}
              placeholder="Ex: Brunch du dimanche"
              autoCorrect={false}
              onSubmitEditing={createCollection}
              returnKeyType="done"
            />
          </TextField>
          <Button
            className="self-start"
            onPress={createCollection}
            isDisabled={createCollectionMutation.isPending}
          >
            {createCollectionMutation.isPending ? (
              <Spinner size="sm" color="default" />
            ) : (
              <Button.Label>Creer la collection</Button.Label>
            )}
          </Button>
        </View>

        <View className="gap-2 rounded-xl bg-secondary p-4">
          <Text className="text-base font-semibold text-foreground">Mes collections</Text>

          {collectionsQuery.isLoading ? (
            <View className="items-center py-2">
              <Spinner size="sm" color="default" />
            </View>
          ) : null}

          {collectionsErrorMessage ? (
            <Text className="text-sm text-danger">{collectionsErrorMessage}</Text>
          ) : null}

          {!collectionsQuery.isLoading && !collectionsQuery.isError && !collectionsQuery.data?.length ? (
            <Text className="text-sm text-muted-foreground">
              Aucune collection pour le moment.
            </Text>
          ) : null}

          {collectionsQuery.data?.map((collection) => (
            <Link
              key={collection.id}
              href={{
                pathname: "/(drawer)/collections/[id]",
                params: { id: String(collection.id) },
              }}
              asChild
            >
              <View className="rounded-xl bg-background px-4 py-3">
                <Text className="text-base font-medium text-foreground">{collection.name}</Text>
                <Text className="text-xs text-muted-foreground">
                  {collection.recipesCount} recette{collection.recipesCount > 1 ? "s" : ""}
                </Text>
              </View>
            </Link>
          ))}
        </View>
      </View>
    </Container>
  );
}
