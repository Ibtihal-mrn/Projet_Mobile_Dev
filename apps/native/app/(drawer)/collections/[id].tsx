import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Card } from "heroui-native";
import { Image, Text, View, useWindowDimensions, Pressable } from "react-native";

import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";
import { useCollectionDetailsPage } from "@my-app/hooks";

type CollectionRecipe = {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  isPublic: boolean;
  prepTime: number;
  authorName: string | null;
  showVisibilityBadge: boolean;
};


export default function CollectionDetailsScreen() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const {
    collectionQuery,
    hasValidId,
    fallbackRecipeImage,
  } = useCollectionDetailsPage({ orpc, collectionId: String(id) });

  const handleBack = () => {
    router.back();
  };  
  
  const SCREEN_PADDING = 24;
  const GAP = 12;
  const columns = width < 420 ? 1 : width < 768 ? 2 : 3;
  const availableWidth = width - SCREEN_PADDING * 2 - GAP * (columns - 1);
  const cardWidth = availableWidth / columns;

  if (!hasValidId) {
    return (
      <Container className="p-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable onPress={handleBack} className="mt-4 mb-2">
          <Text className="text-base text-blue-500">← Retour</Text>
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-foreground">Collection introuvable.</Text>
        </View>
      </Container>
    );
  }

  if (collectionQuery.isLoading) {
    return (
      <Container className="p-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable onPress={handleBack} className="mt-4 mb-2">
          <Text className="text-base text-blue-500">← Retour</Text>
        </Pressable>
        <View className="flex-1 items-center justify-center">
          <Text className="text-base text-foreground">Chargement de la collection...</Text>
        </View>
      </Container>
    );
  }

  if (collectionQuery.isError || !collectionQuery.data) {
    const message =
      collectionQuery.error instanceof Error
        ? collectionQuery.error.message
        : "Collection introuvable.";

    return (
      <Container className="p-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable onPress={handleBack} className="mt-4 mb-2">
          <Text className="text-base text-blue-500">← Retour</Text>
        </Pressable>
        <View className="flex-1 items-center justify-center gap-2">
          <Text className="text-lg text-foreground">Collection introuvable.</Text>
          <Text className="text-sm text-danger">{message}</Text>
        </View>
      </Container>
    );
  }

  const collection = collectionQuery.data;

  return (
    <Container className="p-6">
      <Stack.Screen options={{ headerShown: false }} />

      <Pressable onPress={handleBack} className="mt-4 mb-2">
        <Text className="text-base text-blue-500">← Retour</Text>
      </Pressable>

      <View className="gap-4 pb-6">
        <Text className="text-3xl font-semibold text-foreground">{collection.name}</Text>
        <Text className="text-sm text-muted-foreground">
          {collection.recipes.length} recette{collection.recipes.length > 1 ? "s" : ""}
        </Text>

        {!collection.recipes.length ? (
          <Text className="text-sm text-muted-foreground">
            Cette collection est vide pour le moment.
          </Text>
        ) : null}

        <View className="flex-row flex-wrap">
          {collection.recipes.map((recipe: CollectionRecipe, index: number) => {
            const isLastInRow = (index + 1) % columns === 0;
            const imageUrl = recipe.imageUrl ?? fallbackRecipeImage;

            return (
              <View
                key={recipe.id}
                style={{
                  width: cardWidth,
                  marginRight: isLastInRow ? 0 : GAP,
                  marginBottom: GAP,
                }}
              >
                <Link
                  href={{
                    pathname: "/(drawer)/recipes/[id]",
                    params: { id: String(recipe.id) },
                  }}
                  asChild
                >
                  <Card variant="secondary" className="overflow-hidden" style={{ width: cardWidth }}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={{ width: cardWidth, height: cardWidth }}
                      resizeMode="cover"
                    />

                    <View className="p-3 gap-1">
                      {recipe.showVisibilityBadge ? (
                        <View
                          className={`self-start rounded-full px-2 py-0.5 mb-1 ${recipe.isPublic ? "bg-success/20" : "bg-warning/20"}`}
                        >
                          <Text
                            className={`text-xs font-medium ${recipe.isPublic ? "text-success" : "text-warning"}`}
                          >
                            {recipe.isPublic ? "Public" : "Prive"}
                          </Text>
                        </View>
                      ) : null}

                      <Card.Title className="text-base font-semibold text-foreground" numberOfLines={1}>
                        {recipe.title}
                      </Card.Title>
                        {recipe.authorName ? (
                          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                            Par {recipe.authorName}
                          </Text>
                        ) : null}
                      <Text className="text-xs text-foreground" numberOfLines={2}>
                        {recipe.description}
                      </Text>
                    </View>
                  </Card>
                </Link>
              </View>
            );
          })}
        </View>
      </View>
    </Container>
  );
}
