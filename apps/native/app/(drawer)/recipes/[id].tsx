import { Link, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Button, Input, Spinner, TextField } from "heroui-native";
import { useState } from "react";
import { Alert, Image, Text, View } from "react-native";

import { Container } from "@/components/container";
import { addShoppingList, createShoppingListPdf } from "@/lib/shopping-lists";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";
import { useRecipeDetail } from "@my-app/hooks";

const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

export default function RecipeDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = Number(id);

  const {
    hasValidId,
    recipeQuery,
    recipe,
    collectionsQuery,
    baseServings,
    servings,
    incrementServings,
    decrementServings,
    resetServings,
    scaleQuantity,
    buildShoppingItems,
    authorLabel,
    deleteRecipe,
    deleteError,
    isDeleteConfirmOpen,
    confirmDelete,
    cancelDelete,
    performDelete,
    isSavePanelOpen,
    toggleSavePanel,
    newCollectionName,
    setNewCollectionName,
    saveError,
    savingCollectionId,
    createCollection,
    createCollectionMutation,
    saveToCollection,
  } = useRecipeDetail({
    orpc,
    authClient,
    queryClient,
    recipeId,
    onDeleted: () => router.replace("/(drawer)"),
  });

  // PDF = spécifique natif (Expo), reste dans la page
  const [isGeneratingList, setIsGeneratingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  async function generateIngredientsList() {
    if (!recipe) return;
    setIsGeneratingList(true);
    try {
      const pdf = await createShoppingListPdf({
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        servings,
        baseServings,
        items: buildShoppingItems(),
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
          <Text className="text-sm font-medium text-foreground">Auteur: {authorLabel}</Text>
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
                href={{ pathname: "/(drawer)/recipes/edit/[id]", params: { id: String(recipe.id) } }}
                asChild
              >
                <Button className="self-start" isDisabled={deleteRecipe.isPending}>
                  <Button.Label>Modifier</Button.Label>
                </Button>
              </Link>

              <Button className="self-start" onPress={confirmDelete} isDisabled={deleteRecipe.isPending}>
                {deleteRecipe.isPending ? (
                  <Spinner size="sm" color="default" />
                ) : (
                  <Button.Label>Supprimer</Button.Label>
                )}
              </Button>
            </View>
          ) : null}

          {isDeleteConfirmOpen ? (
            <View className="gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4">
              <Text className="text-base font-semibold text-foreground">Supprimer la recette ?</Text>
              <Text className="text-sm text-foreground">
                Cette action est définitive. La recette sera supprimée pour de bon.
              </Text>

              <View className="flex-row gap-2">
                <Button
                  variant="outline"
                  className="self-start"
                  onPress={cancelDelete}
                  isDisabled={deleteRecipe.isPending}
                >
                  <Button.Label>Annuler</Button.Label>
                </Button>

                <Button className="self-start" onPress={performDelete} isDisabled={deleteRecipe.isPending}>
                  {deleteRecipe.isPending ? (
                    <Spinner size="sm" color="default" />
                  ) : (
                    <Button.Label>Confirmer</Button.Label>
                  )}
                </Button>
              </View>
            </View>
          ) : null}
        </View>

        <View className="gap-2">
          <View className="flex-row gap-2">
            <Button
              className="self-start"
              variant={isSavePanelOpen ? "outline" : "primary"}
              onPress={toggleSavePanel}
            >
              <Button.Label>{isSavePanelOpen ? "Fermer" : "Enregistrer"}</Button.Label>
            </Button>
          </View>

          {isSavePanelOpen ? (
            <View className="gap-3 rounded-xl bg-secondary p-4">
              <Text className="text-base font-semibold text-foreground">Enregistrer dans une collection</Text>

              {saveError ? <Text className="text-sm text-danger">{saveError}</Text> : null}

              <View className="gap-2">
                <TextField>
                  <Input
                    value={newCollectionName}
                    onChangeText={setNewCollectionName}
                    placeholder="Nom de la nouvelle collection"
                    autoCorrect={false}
                    onSubmitEditing={createCollection}
                    returnKeyType="done"
                  />
                </TextField>
                <Button
                  className="self-start"
                  variant="outline"
                  onPress={createCollection}
                  isDisabled={createCollectionMutation.isPending}
                >
                  {createCollectionMutation.isPending ? (
                    <Spinner size="sm" color="default" />
                  ) : (
                    <Button.Label>Créer une collection</Button.Label>
                  )}
                </Button>
              </View>

              {collectionsQuery.isLoading ? (
                <View className="items-center py-2">
                  <Spinner size="sm" color="default" />
                </View>
              ) : null}

              {collectionsQuery.data?.map((collection) => {
                const isSaving = savingCollectionId === collection.id;
                return (
                  <View
                    key={collection.id}
                    className="flex-row items-center justify-between rounded-lg bg-background px-3 py-2"
                  >
                    <View className="shrink pr-2">
                      <Text className="text-sm font-medium text-foreground">{collection.name}</Text>
                      <Text className="text-xs text-muted-foreground">
                        {collection.recipesCount} recette{collection.recipesCount > 1 ? "s" : ""}
                      </Text>
                    </View>

                    <Button
                      size="sm"
                      variant={collection.hasRecipe ? "outline" : "primary"}
                      onPress={() => saveToCollection(collection.id)}
                      isDisabled={isSaving || collection.hasRecipe}
                    >
                      {isSaving ? (
                        <Spinner size="sm" color="default" />
                      ) : (
                        <Button.Label>{collection.hasRecipe ? "Déjà enregistrée" : "Enregistrer"}</Button.Label>
                      )}
                    </Button>
                  </View>
                );
              })}

              {!collectionsQuery.isLoading && !collectionsQuery.data?.length ? (
                <Text className="text-sm text-muted-foreground">
                  Crée d'abord une collection puis enregistre ta recette.
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View className="gap-2">
          <Text className="text-xl font-semibold text-foreground">Adapter les portions</Text>
          <View className="flex-row items-center gap-3">
            <Button className="self-start" onPress={decrementServings} isDisabled={servings <= 1}>
              <Button.Label>-</Button.Label>
            </Button>
            <Text className="text-base text-foreground">{servings} personne{servings > 1 ? "s" : ""}</Text>
            <Button className="self-start" onPress={incrementServings}>
              <Button.Label>+</Button.Label>
            </Button>
            <Button className="self-start" onPress={resetServings}>
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
            const scaledQuantity = scaleQuantity(ingredient.quantity);
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