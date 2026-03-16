import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "heroui-native";
import { Image, Text, View } from "react-native";

import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";

const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

export default function RecipeDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = Number(id);
  const hasValidId = Number.isInteger(recipeId) && recipeId > 0;
  // Récupère les détails de la recette depuis l'API
  const recipeQuery = useQuery(
    orpc.recipe.byId.queryOptions({
      input: { id: hasValidId ? recipeId : 1 },
    }),
  );

  const recipe = hasValidId ? recipeQuery.data : null;

  if (!hasValidId) {
    return (
      <Container className="p-6">
        <Stack.Screen options={{ title: "Recette" }} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-foreground">Recette introuvable.</Text>
        </View>
      </Container>
    );
  }

  if (recipeQuery.isLoading) {
    return (
      <Container className="p-6">
        <Stack.Screen options={{ title: "Recette" }} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-base text-foreground">Chargement de la recette...</Text>
        </View>
      </Container>
    );
  }

  if (!recipe) {
    return (
      <Container className="p-6">
        <Stack.Screen options={{ title: "Recette" }} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-foreground">Recette introuvable.</Text>
        </View>
      </Container>
    );
  }

  const imageUrl = recipe.imageUrl ?? FALLBACK_RECIPE_IMAGE;

  return (
    <Container className="pb-6">
      <Stack.Screen options={{ title: recipe.title }} />

      <Image source={{ uri: imageUrl }} className="h-64 w-full" resizeMode="cover" />

      <View className="px-6 pt-5 gap-5">
        <View className="gap-2">
          <Text className="text-3xl font-semibold text-foreground">{recipe.title}</Text>
          <Text className="text-base text-foreground">{recipe.description}</Text>
          <Text className="text-sm text-foreground">Préparation: {recipe.prepTime} min</Text>

          {recipe.isOwner ? (
            <Link
              href={{
                pathname: "/(drawer)/recipes/edit/[id]",
                params: { id: String(recipe.id) },
              }}
              asChild
            >
              <Button className="self-start">
                <Button.Label>Modifier</Button.Label>
              </Button>
            </Link>
          ) : null}
        </View>

        <View className="gap-2">
          <Text className="text-xl font-semibold text-foreground">Ingrédients</Text>
          {recipe.ingredients.map((ingredient) => (
            <Text key={ingredient.id} className="text-base text-foreground">
              • {ingredient.quantity ? `${ingredient.quantity} ` : ""}
              {ingredient.unit ? `${ingredient.unit} ` : ""}
              {ingredient.ingredient.name}
            </Text>
          ))}
        </View>

        <View className="gap-2 pb-8">
          <Text className="text-xl font-semibold text-foreground">Préparation</Text>
          {recipe.steps.map((step) => (
            <Text key={step.id} className="text-base text-foreground">
              {step.stepOrder}. {step.content}
            </Text>
          ))}
        </View>
      </View>
    </Container>
  );
}