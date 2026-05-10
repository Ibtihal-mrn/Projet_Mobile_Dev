import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Card, Spinner } from "heroui-native";
import { Image, Text, View, useWindowDimensions } from "react-native";

import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";

const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

function relationLabel(relationStatus: string) {
  switch (relationStatus) {
    case "self":
      return "Ton profil";
    case "friend":
      return "Ami";
    case "incoming_pending":
      return "Demande reçue";
    case "outgoing_pending":
      return "Demande envoyée";
    default:
      return "Profil public";
  }
}

export default function UserProfileScreen() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();

  const profileUserId = Number(id);
  const hasValidId = Number.isInteger(profileUserId) && profileUserId > 0;

  const profileQuery = useQuery({
    ...orpc.user.profile.queryOptions({
      input: { userId: hasValidId ? profileUserId : 1 },
    }),
    enabled: hasValidId,
  });

  const SCREEN_PADDING = 24;
  const GAP = 12;
  const columns = width < 420 ? 1 : width < 768 ? 2 : 3;
  const availableWidth = width - SCREEN_PADDING * 2 - GAP * (columns - 1);
  const cardWidth = availableWidth / columns;

  if (!hasValidId) {
    return (
      <Container className="p-6">
        <Stack.Screen options={{ title: "Profil" }} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-foreground">Profil introuvable.</Text>
        </View>
      </Container>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <Container className="p-6">
        <Stack.Screen options={{ title: "Profil" }} />
        <View className="flex-1 items-center justify-center gap-3">
          <Spinner size="lg" color="default" />
          <Text className="text-base text-foreground">Chargement du profil...</Text>
        </View>
      </Container>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    const message =
      profileQuery.error instanceof Error ? profileQuery.error.message : "Profil introuvable.";

    return (
      <Container className="p-6">
        <Stack.Screen options={{ title: "Profil" }} />
        <View className="flex-1 items-center justify-center gap-2">
          <Text className="text-lg text-foreground">Profil introuvable.</Text>
          <Text className="text-sm text-danger">{message}</Text>
        </View>
      </Container>
    );
  }

  const profile = profileQuery.data;

  return (
    <Container className="p-6">
      <Stack.Screen options={{ title: profile.username }} />

      <View className="gap-5 pb-8">
        <View className="flex-row items-center gap-4 rounded-3xl bg-secondary p-4">
          <Image source={{ uri: profile.avatarUrl }} className="h-20 w-20 rounded-full bg-background" />

          <View className="flex-1 gap-2">
            <Text className="text-3xl font-semibold text-foreground">{profile.username}</Text>
            <View className="self-start rounded-full bg-background px-3 py-1">
              <Text className="text-xs font-medium text-foreground">
                {relationLabel(profile.relationStatus)}
              </Text>
            </View>
            <Text className="text-sm text-foreground">
              {profile.canSeePrivateContent
                ? "Tu vois ses recettes privées et ses enregistrements parce que vous êtes amis."
                : "Tu vois seulement ses contenus publics. Deviens ami pour accéder au reste."}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-secondary p-4">
            <Text className="text-xs uppercase tracking-wide text-foreground">Recettes personelles</Text>
            <Text className="mt-1 text-2xl font-semibold text-foreground">{profile.recipes.length}</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-secondary p-4">
            <Text className="text-xs uppercase tracking-wide text-foreground">Collections de recettes</Text>
            <Text className="mt-1 text-2xl font-semibold text-foreground">
              {profile.collections.length}
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <Text className="text-xl font-semibold text-foreground">Recettes visibles</Text>

          {!profile.recipes.length ? (
            <Text className="text-sm text-foreground">Aucune recette visible pour le moment.</Text>
          ) : null}

          <View className="flex-row flex-wrap">
            {profile.recipes.map((recipe, index) => {
              const isLastInRow = (index + 1) % columns === 0;
              const imageUrl = recipe.imageUrl ?? FALLBACK_RECIPE_IMAGE;

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
                        style={{ width: cardWidth, height: cardWidth * 0.5625 }}
                        resizeMode="cover"
                      />

                      <View className="p-3 gap-1">
                        <Text className="text-xs text-foreground">{recipe.prepTime} min</Text>
                        {recipe.showVisibilityBadge ? (
                          <View
                            className={`self-start rounded-full px-2 py-0.5 mb-1 ${recipe.isPublic ? "bg-success/20" : "bg-warning/20"}`}
                          >
                            <Text
                              className={`text-xs font-medium ${recipe.isPublic ? "text-success" : "text-warning"}`}
                            >
                              {recipe.isPublic ? "Public" : "Privé"}
                            </Text>
                          </View>
                        ) : null}

                        <Card.Title className="text-base font-semibold text-foreground" numberOfLines={1}>
                          {recipe.title}
                        </Card.Title>
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

        {profile.canSeePrivateContent ? (
          <View className="gap-3">
            <Text className="text-xl font-semibold text-foreground">Collections</Text>

            {!profile.collections.length ? (
              <Text className="text-sm text-foreground">
                Cet utilisateur n'a pas encore créé de collection.
              </Text>
            ) : null}

            <View className="flex-row flex-wrap">
              {profile.collections.map((collection, index) => {
                const isLastInRow = (index + 1) % columns === 0;
                const imageUrl = collection.imageUrls?.[0] ?? FALLBACK_RECIPE_IMAGE;

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
                      <Card variant="secondary" className="overflow-hidden relative" style={{ width: cardWidth, height: cardWidth }}>
                        <Image
                          source={{ uri: imageUrl }}
                          style={{ width: cardWidth, height: cardWidth }}
                          resizeMode="cover"
                        />

                        <View
                          className="absolute bottom-0 left-0 right-0 items-start justify-end bg-black/50 px-3 py-3"
                          style={{ height: "30%" }}
                        >
                          <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                            {collection.name}
                          </Text>
                          <Text className="text-xs text-white/80">
                            {collection.recipesCount} recette{collection.recipesCount > 1 ? "s" : ""}
                          </Text>
                        </View>
                      </Card>
                    </Link>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </View>
    </Container>
  );
}