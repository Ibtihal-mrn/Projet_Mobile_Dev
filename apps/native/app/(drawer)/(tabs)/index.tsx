import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "heroui-native";
import { Image, Text, View, useWindowDimensions } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";

const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

export default function Home() {
  const { width } = useWindowDimensions();
  const { data: session } = authClient.useSession();

  // Récupère uniquement les recettes du compte connecté
  const recipes = useQuery({
    ...orpc.recipe.mine.queryOptions(),
    enabled: Boolean(session?.user),
  });
  const recipesErrorMessage =
    recipes.error instanceof Error ? recipes.error.message : "Impossible de charger les recettes.";

  const SCREEN_PADDING = 24;
  const GAP = 12;

  // 1 colonne sur un petit écran, 2 sur mobile, 3 sur tablette
  const columns = width < 420 ? 1 : width < 768 ? 2 : 3;

  // largeur dispo = écran - padding - gap entre les cartes
  const availableWidth = width - SCREEN_PADDING * 2 - GAP * (columns - 1);
  const cardWidth = availableWidth / columns;

  if (!session?.user) {
    return (
      <Container className="p-6">
        <View className="gap-4 pb-8">
          <Text className="text-3xl font-semibold text-foreground">Mes recettes</Text>
          <Text className="text-sm text-muted-foreground">
            Connecte-toi pour voir les recettes que tu as créées.
          </Text>

          <Link href="/(drawer)/recipes/new" asChild>
            <Button className="self-start">
              <Button.Label>+ Nouvelle recette</Button.Label>
            </Button>
          </Link>

          <SignIn />
          <SignUp />
        </View>
      </Container>
    );
  }

  return (
    <Container className="p-6">
      <View className="gap-4 pb-6">
        <Text className="text-3xl font-semibold text-foreground">Mes recettes</Text>
        <Text className="text-base text-foreground">
          Retrouve uniquement les recettes que tu as créées.
        </Text>

        <Link href="/(drawer)/recipes/new" asChild>
          <Button className="self-start">
            <Button.Label>+ Nouvelle recette</Button.Label>
          </Button>
        </Link>

        <View className="flex-row flex-wrap">
          {recipes.isLoading ? (
            <Text className="text-sm text-foreground">Chargement des recettes...</Text>
          ) : null}

          {recipes.isError ? (
            <Text className="text-sm text-danger">Erreur: {recipesErrorMessage}</Text>
          ) : null}

          {!recipes.isLoading && !recipes.isError && !recipes.data?.length ? (
            <Text className="text-sm text-foreground">Aucune recette disponible.</Text>
          ) : null}

          {recipes.data?.map((recipe, index) => {
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
                  <Card
                    variant="secondary"
                    className="overflow-hidden"
                    style={{ width: cardWidth }}
                  >
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
                          <Text className={`text-xs font-medium ${recipe.isPublic ? "text-success" : "text-warning"}`}>
                            {recipe.isPublic ? "Public" : "Privé"}
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

