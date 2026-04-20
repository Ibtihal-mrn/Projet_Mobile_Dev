import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Button, Spinner } from "heroui-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, Text, View } from "react-native";

import { Container } from "@/components/container";
import { scaleIngredientQuantity } from "@/lib/recipe-scaling";
import { addShoppingList, createShoppingListPdf } from "@/lib/shopping-lists";
import { orpc, queryClient } from "@/utils/orpc";

const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

export default function RecipeDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = Number(id);
  const hasValidId = Number.isInteger(recipeId) && recipeId > 0;
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [servings, setServings] = useState(2);
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const deleteRecipe = useMutation(
    orpc.recipe.delete.mutationOptions({
      onSuccess: async () => {
        setDeleteError(null);
        await queryClient.invalidateQueries({ queryKey: orpc.recipe.list.queryKey() });
        router.replace("/(drawer)");
      },
      onError: (error) => {
        const message = error.message || "Impossible de supprimer la recette.";

        if (message.toLowerCase().includes("forbidden")) {
          setDeleteError("Tu ne peux supprimer que tes propres recettes.");
          return;
        }

        if (message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("401")) {
          setDeleteError("Tu dois etre connecte(e) pour supprimer une recette.");
          return;
        }

        setDeleteError(message);
      },
    }),
  );

  function confirmDelete(recipeToDeleteId: number) {
    Alert.alert(
      "Supprimer la recette",
      "Cette action est définitive. Voulez-vous continuer ?",
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            deleteRecipe.mutate({ id: recipeToDeleteId });
          },
        },
      ],
    );
  }

  // Récupère les détails de la recette depuis l'API
  const recipeQuery = useQuery(
    orpc.recipe.byId.queryOptions({
      input: { id: hasValidId ? recipeId : 1 },
    }),
  );

  const recipe = hasValidId ? recipeQuery.data : null;

  const baseServings = useMemo(() => {
    const maybeServings = (recipe as { servings?: number } | null)?.servings;
    if (typeof maybeServings === "number" && Number.isFinite(maybeServings) && maybeServings > 0) {
      return Math.round(maybeServings);
    }

    return 2;
  }, [recipe]);

  useEffect(() => {
    setServings(baseServings);
  }, [baseServings]);

  async function generateIngredientsList() {
    if (!recipe) {
      return;
    }

    setIsGeneratingList(true);

    try {
      const items = recipe.ingredients.map((ingredient) => {
        const scaledQuantity = scaleIngredientQuantity(ingredient.quantity, baseServings, servings);
        const quantityText = scaledQuantity ? `${scaledQuantity} ` : "";
        const unitText = ingredient.unit ? `${ingredient.unit} ` : "";
        return `${quantityText}${unitText}${ingredient.ingredient.name}`.trim();
      });

      const pdf = await createShoppingListPdf({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        servings,
        baseServings,
        items,
      });

      await addShoppingList(pdf);
      setListError(null);

      Alert.alert(
        "PDF généré",
        "La liste de courses a été enregistrée. Tu peux la retrouver dans l'onglet Liste de courses.",
      );
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : "Impossible de générer la liste de courses en PDF.",
      );
    } finally {
      setIsGeneratingList(false);
    }
  }

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
          <Text className="text-sm text-foreground">Portions de base: {baseServings}</Text>

          {recipe.showVisibilityBadge ? (
            <View className="self-start rounded-full bg-secondary px-3 py-1">
              <Text className="text-xs font-medium text-foreground">
                {recipe.isPublic ? "Public" : "Privé (amis)"}
              </Text>
            </View>
          ) : null}

          {deleteError ? <Text className="text-sm text-danger">{deleteError}</Text> : null}

          {recipe.isOwner ? (
            <View className="flex-row gap-2">
              <Link
                href={{
                  pathname: "/(drawer)/recipes/edit/[id]",
                  params: { id: String(recipe.id) },
                }}
                asChild
              >
                <Button className="self-start" isDisabled={deleteRecipe.isPending}>
                  <Button.Label>Modifier</Button.Label>
                </Button>
              </Link>

              <Button
                className="self-start"
                onPress={() => confirmDelete(recipe.id)}
                isDisabled={deleteRecipe.isPending}
              >
                {deleteRecipe.isPending ? (
                  <Spinner size="sm" color="default" />
                ) : (
                  <Button.Label>Supprimer</Button.Label>
                )}
              </Button>
            </View>
          ) : null}
        </View>

        <View className="gap-2">
          <Text className="text-xl font-semibold text-foreground">Adapter les portions</Text>
          <View className="flex-row items-center gap-3">
            <Button
              className="self-start"
              onPress={() => setServings((previous) => Math.max(1, previous - 1))}
              isDisabled={servings <= 1}
            >
              <Button.Label>-</Button.Label>
            </Button>
            <Text className="text-base text-foreground">{servings} personne{servings > 1 ? "s" : ""}</Text>
            <Button className="self-start" onPress={() => setServings((previous) => previous + 1)}>
              <Button.Label>+</Button.Label>
            </Button>
            <Button className="self-start" onPress={() => setServings(baseServings)}>
              <Button.Label>Reset</Button.Label>
            </Button>
          </View>
        </View>

        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-xl font-semibold text-foreground">Ingrédients</Text>
            <Button className="self-start" onPress={generateIngredientsList} isDisabled={isGeneratingList}>
              {isGeneratingList ? <Spinner size="sm" color="default" /> : <Button.Label>Générer la liste</Button.Label>}
            </Button>
          </View>

          {listError ? <Text className="text-sm text-danger">{listError}</Text> : null}

          {recipe.ingredients.map((ingredient) => {
            const scaledQuantity = scaleIngredientQuantity(
              ingredient.quantity,
              baseServings,
              servings,
            );

            return (
              <Text key={ingredient.id} className="text-base text-foreground">
                • {scaledQuantity ? `${scaledQuantity} ` : ""}
                {ingredient.unit ? `${ingredient.unit} ` : ""}
                {ingredient.ingredient.name}
              </Text>
            );
          })}
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