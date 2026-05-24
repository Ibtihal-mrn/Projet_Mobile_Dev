import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "heroui-native";
import { Image, Text, View, useWindowDimensions } from "react-native";
import {authClient} from "@/lib/auth-client";
import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";
import { useHomePage } from "@my-app/hooks";

export default function HomePageScreen() {
  const { width } = useWindowDimensions();
  const {
    session,
    recipes,
    recipesErrorMessage,
    fallbackRecipeImage: FALLBACK_RECIPE_IMAGE,    
  } = useHomePage({ orpc, authClient });

  const SCREEN_PADDING = 24;
  const GAP = 12;

  // 1 colonne sur un petit écran, 2 sur mobile, 3 sur tablette
  const columns = width < 420 ? 1 : width < 768 ? 2 : 3;

  // largeur dispo = écran - padding - gap entre les cartes
  const availableWidth = width - SCREEN_PADDING * 2 - GAP * (columns - 1);
  const cardWidth = availableWidth / columns;

  return (
    <Container className="p-6">
      <View className="gap-4 pb-6">
        <Text className="text-3xl font-semibold text-foreground">Recettes</Text>
        <Text className="text-base text-foreground">
          Découvre des idées simples et clique pour voir le détail.
        </Text>

        

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
                        <Text className="text-xs text-foreground" numberOfLines={1}>
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
