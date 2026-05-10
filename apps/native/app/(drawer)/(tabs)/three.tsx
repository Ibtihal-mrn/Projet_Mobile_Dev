import { Link } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button, Input, Spinner, TextField, Card } from "heroui-native";
import { useMemo, useState } from "react";
import { Text, View, Image, useWindowDimensions } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

const FALLBACK_COLLECTION_IMAGE =
  "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=500&q=60";

export default function CollectionsScreen() {
  const { width } = useWindowDimensions();
  const { data: session } = authClient.useSession();
  const [newCollectionName, setNewCollectionName] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const SCREEN_PADDING = 24;
  const GAP = 12;

  // 1 colonne sur petit écran, 2 sur mobile, 3+ sur tablette
  const columns = width < 420 ? 1 : width < 768 ? 2 : 3;

  const availableWidth = width - SCREEN_PADDING * 2 - GAP * (columns - 1);
  const cardWidth = availableWidth / columns;

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

        <View className="gap-2">
          <Text className="text-base font-semibold text-foreground">Mes collections</Text>

          {collectionsQuery.isLoading ? (
            <View className="items-center py-4">
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

          {collectionsQuery.data && collectionsQuery.data.length > 0 ? (
            <View className="flex-row flex-wrap">
              {collectionsQuery.data.map((collection, index) => {
                const isLastInRow = (index + 1) % columns === 0;
                const collectionImage = collection.imageUrls?.[0] ?? FALLBACK_COLLECTION_IMAGE;

                return (
                  <View
                    key={collection.id}
                    style={{
                      width: cardWidth,
                      marginRight: isLastInRow ? 0 : GAP,
                      marginBottom: GAP,
                    }}
                  >
                    <Link
                      href={{
                        pathname: "/(drawer)/collections/[id]",
                        params: { id: String(collection.id) },
                      }}
                      asChild
                    >
                      <Card variant="secondary" className="overflow-hidden" style={{ width: cardWidth }}>
                        {/* Single image with overlay info */}
                        <View style={{ width: cardWidth, height: cardWidth, position: "relative" }}>
                          <Image
                            source={{ uri: collectionImage }}
                            style={{ width: "100%", height: "100%" }}
                            resizeMode="cover"
                          />

                          {/* Dark gradient overlay for text readability */}
                          <View
                            style={{
                              position: "absolute",
                              bottom: 0,
                              left: 0,
                              right: 0,
                              height: "20%",
                              backgroundColor: "rgba(0, 0, 0, 0.5)",
                            }}
                          />

                          {/* Collection info */}
                          <View className="absolute bottom-0 inset-x-0 p-3">
                            <Text
                              className="text-lg font-semibold text-white"
                              numberOfLines={2}
                            >
                              {collection.name}
                            </Text>
                            <Text className="text-xs text-gray-100 mt-1">
                              {collection.recipesCount} recette{collection.recipesCount > 1 ? "s" : ""}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    </Link>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>
    </Container>
  );
}
