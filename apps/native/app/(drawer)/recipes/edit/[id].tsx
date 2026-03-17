import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Input, Label, Spinner, TextField } from "heroui-native";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { orpc, queryClient } from "@/utils/orpc";

type IngredientFormRow = {
  name: string;
  quantity: string;
  unit: string;
};

const DEFAULT_IMAGE_URL =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

function emptyIngredient(): IngredientFormRow {
  return { name: "", quantity: "", unit: "" };
}

export default function EditRecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipeId = Number(id);
  const hasValidId = Number.isInteger(recipeId) && recipeId > 0;
  const { data: session } = authClient.useSession();

  const recipeQuery = useQuery(
    orpc.recipe.byId.queryOptions({
      input: { id: hasValidId ? recipeId : 1 },
    }),
  );

  const recipe = hasValidId ? recipeQuery.data : null;

  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState("30");
  const [isPublic, setIsPublic] = useState(true);
  const [imageUrl, setImageUrl] = useState("");
  const [ingredients, setIngredients] = useState<IngredientFormRow[]>([emptyIngredient()]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [formError, setFormError] = useState<string | null>(null);
  const [hasHydratedForm, setHasHydratedForm] = useState(false);

  const totalSteps = 3;

  useEffect(() => {
    if (!recipe || hasHydratedForm) {
      return;
    }

    setTitle(recipe.title);
    setDescription(recipe.description);
    setPrepTime(String(recipe.prepTime));
    setIsPublic(recipe.isPublic);
    setImageUrl(recipe.imageUrl ?? "");
    setIngredients(
      recipe.ingredients.length
        ? recipe.ingredients.map((ingredient) => ({
            name: ingredient.ingredient.name,
            quantity: ingredient.quantity ?? "",
            unit: ingredient.unit ?? "",
          }))
        : [emptyIngredient()],
    );
    setSteps(recipe.steps.length ? recipe.steps.map((step) => step.content) : [""]);
    setHasHydratedForm(true);
  }, [recipe, hasHydratedForm]);

  const updateRecipe = useMutation(
    orpc.recipe.update.mutationOptions({
      onSuccess: async (updatedRecipe) => {
        setFormError(null);
        await queryClient.invalidateQueries();
        router.replace({
          pathname: "/(drawer)/recipes/[id]",
          params: { id: String(updatedRecipe.id) },
        });
      },
      onError: (error) => {
        const message = error.message || "Impossible de modifier la recette.";

        if (message.toLowerCase().includes("forbidden")) {
          setFormError("Tu ne peux modifier que tes propres recettes.");
          return;
        }

        if (message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("401")) {
          setFormError("Tu dois etre connecte(e) pour modifier une recette.");
          return;
        }

        setFormError(message);
      },
    }),
  );

  const cleanedIngredients = useMemo(
    () =>
      ingredients
        .map((ingredient) => {
          const name = ingredient.name.trim();
          const quantity = ingredient.quantity.trim();
          const unit = ingredient.unit.trim();

          if (!name) return null;

          return {
            name,
            quantity: quantity || undefined,
            unit: unit || undefined,
          };
        })
        .filter(Boolean) as Array<{ name: string; quantity?: string; unit?: string }>,
    [ingredients],
  );

  const cleanedSteps = useMemo(() => steps.map((step) => step.trim()).filter(Boolean), [steps]);

  function nextStep() {
    setFormError(null);

    if (currentStep === 1) {
      if (!title.trim()) {
        setFormError("Le titre est requis.");
        return;
      }

      if (!description.trim()) {
        setFormError("La description est requise.");
        return;
      }

      const prepTimeNumber = Number(prepTime);
      if (!Number.isInteger(prepTimeNumber) || prepTimeNumber <= 0) {
        setFormError("Le temps de préparation doit etre un entier positif.");
        return;
      }

      if (imageUrl.trim().length > 0) {
        try {
          new URL(imageUrl.trim());
        } catch {
          setFormError("L'URL de l'image n'est pas valide.");
          return;
        }
      }
    }

    if (currentStep === 2 && cleanedIngredients.length === 0) {
      setFormError("Ajoute au moins un ingrédient.");
      return;
    }

    setCurrentStep((previous) => Math.min(previous + 1, totalSteps));
  }

  function previousStep() {
    setFormError(null);
    setCurrentStep((previous) => Math.max(previous - 1, 1));
  }

  function submitRecipe() {
    setFormError(null);

    if (!session?.user) {
      setFormError("Tu dois etre connecte(e) pour modifier une recette.");
      return;
    }

    if (!hasValidId) {
      setFormError("Identifiant de recette invalide.");
      return;
    }

    if (cleanedSteps.length === 0) {
      setFormError("Ajoute au moins une étape de préparation.");
      return;
    }

    const prepTimeNumber = Number(prepTime);
    if (!Number.isInteger(prepTimeNumber) || prepTimeNumber <= 0) {
      setFormError("Le temps de préparation doit etre un entier positif.");
      return;
    }

    updateRecipe.mutate({
      id: recipeId,
      title: title.trim(),
      description: description.trim(),
      isPublic,
      prepTime: prepTimeNumber,
      imageUrl: imageUrl.trim() || DEFAULT_IMAGE_URL,
      ingredients: cleanedIngredients,
      steps: cleanedSteps,
    });
  }

  if (!hasValidId) {
    return (
      <Container className="p-6">
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-foreground">Recette introuvable.</Text>
        </View>
      </Container>
    );
  }

  if (recipeQuery.isLoading && !hasHydratedForm) {
    return (
      <Container className="p-6">
        <View className="flex-1 items-center justify-center gap-4">
          <Spinner size="lg" color="default" />
          <Text className="text-base text-foreground">Chargement de la recette...</Text>
        </View>
      </Container>
    );
  }

  if (!recipe) {
    return (
      <Container className="p-6">
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-foreground">Recette introuvable.</Text>
        </View>
      </Container>
    );
  }

  if (!session?.user) {
    return (
      <Container className="p-6">
        <View className="gap-4 pb-8">
          <Text className="text-3xl font-semibold text-foreground">Modifier la recette</Text>
          <Text className="text-sm text-muted-foreground">Connecte-toi pour modifier une recette.</Text>
          <SignIn />
          <SignUp />
        </View>
      </Container>
    );
  }

  if (!recipe.isOwner) {
    return (
      <Container className="p-6">
        <View className="flex-1 items-center justify-center gap-4">
          <Text className="text-lg text-foreground">Acces refuse.</Text>
          <Text className="text-sm text-muted-foreground">
            Tu ne peux modifier que tes propres recettes.
          </Text>
        </View>
      </Container>
    );
  }

  return (
    <Container className="p-6">
      <View className="gap-4 pb-8">
        <Text className="text-3xl font-semibold text-foreground">Modifier la recette</Text>
        <Text className="text-sm text-muted-foreground">Étape {currentStep}/{totalSteps}</Text>

        {formError || updateRecipe.isError ? (
          <Text className="text-sm text-danger">
            {formError || (updateRecipe.error?.message ?? "Impossible de modifier la recette.")}
          </Text>
        ) : null}

        {currentStep === 1 ? (
          <View className="gap-3">
            <TextField>
              <Label>Titre *</Label>
              <Input value={title} onChangeText={setTitle} placeholder="Ex: Lasagnes maison" />
            </TextField>

            <TextField>
              <Label>Description *</Label>
              <Input
                value={description}
                onChangeText={setDescription}
                placeholder="Décris la recette en une phrase"
                multiline
              />
            </TextField>

            <TextField>
              <Label>Temps de préparation (minutes) *</Label>
              <Input
                value={prepTime}
                onChangeText={setPrepTime}
                placeholder="30"
                keyboardType="numeric"
              />
            </TextField>

            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">Visibilité</Text>
              <View className="flex-row gap-2">
                <Button onPress={() => setIsPublic(true)} isDisabled={isPublic}>
                  <Button.Label>Public</Button.Label>
                </Button>
                <Button onPress={() => setIsPublic(false)} isDisabled={!isPublic}>
                  <Button.Label>Amis uniquement</Button.Label>
                </Button>
              </View>
            </View>

            <TextField>
              <Label>Image URL (optionnel)</Label>
              <Input
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="https://..."
                autoCapitalize="none"
              />
            </TextField>
          </View>
        ) : null}

        {currentStep === 2 ? (
          <View className="gap-3">
            {ingredients.map((ingredient, index) => (
              <View key={"ingredient-row-" + (index + 1)} className="gap-2 rounded-lg border border-divider p-3">
                <Text className="text-sm font-medium text-foreground">Ingrédient {index + 1}</Text>

                <TextField>
                  <Label>Nom *</Label>
                  <Input
                    value={ingredient.name}
                    onChangeText={(value) =>
                      setIngredients((previous) =>
                        previous.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, name: value } : item,
                        ),
                      )
                    }
                    placeholder="Ex: tomate"
                  />
                </TextField>

                <TextField>
                  <Label>Quantité (optionnel)</Label>
                  <Input
                    value={ingredient.quantity}
                    onChangeText={(value) =>
                      setIngredients((previous) =>
                        previous.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, quantity: value } : item,
                        ),
                      )
                    }
                    placeholder="Ex: 200"
                  />
                </TextField>

                <TextField>
                  <Label>Unité (optionnel)</Label>
                  <Input
                    value={ingredient.unit}
                    onChangeText={(value) =>
                      setIngredients((previous) =>
                        previous.map((item, currentIndex) =>
                          currentIndex === index ? { ...item, unit: value } : item,
                        ),
                      )
                    }
                    placeholder="Ex: g, ml, c. a soupe"
                  />
                </TextField>

                {ingredients.length > 1 ? (
                  <Button
                    onPress={() =>
                      setIngredients((previous) => previous.filter((_, currentIndex) => currentIndex !== index))
                    }
                  >
                    <Button.Label>Supprimer cet ingrédient</Button.Label>
                  </Button>
                ) : null}
              </View>
            ))}

            <Button onPress={() => setIngredients((previous) => [...previous, emptyIngredient()])}>
              <Button.Label>+ Ajouter un ingrédient</Button.Label>
            </Button>
          </View>
        ) : null}

        {currentStep === 3 ? (
          <View className="gap-3">
            {steps.map((step, index) => (
              <View key={"step-row-" + (index + 1)} className="gap-2 rounded-lg border border-divider p-3">
                <Text className="text-sm font-medium text-foreground">Étape {index + 1}</Text>

                <TextField>
                  <Input
                    value={step}
                    onChangeText={(value) =>
                      setSteps((previous) =>
                        previous.map((item, currentIndex) => (currentIndex === index ? value : item)),
                      )
                    }
                    placeholder="Décris l'étape"
                    multiline
                  />
                </TextField>

                {steps.length > 1 ? (
                  <Button
                    onPress={() =>
                      setSteps((previous) => previous.filter((_, currentIndex) => currentIndex !== index))
                    }
                  >
                    <Button.Label>Supprimer cette étape</Button.Label>
                  </Button>
                ) : null}
              </View>
            ))}

            <Button onPress={() => setSteps((previous) => [...previous, ""])}>
              <Button.Label>+ Ajouter une étape</Button.Label>
            </Button>
          </View>
        ) : null}

        <View className="flex-row items-center justify-between pt-2">
          <Button onPress={previousStep} isDisabled={currentStep === 1 || updateRecipe.isPending}>
            <Button.Label>Précédent</Button.Label>
          </Button>

          {currentStep < totalSteps ? (
            <Button onPress={nextStep} isDisabled={updateRecipe.isPending}>
              <Button.Label>Suivant</Button.Label>
            </Button>
          ) : (
            <Button onPress={submitRecipe} isDisabled={updateRecipe.isPending}>
              {updateRecipe.isPending ? (
                <Spinner size="sm" color="default" />
              ) : (
                <Button.Label>Enregistrer les modifications</Button.Label>
              )}
            </Button>
          )}
        </View>
      </View>
    </Container>
  );
}
