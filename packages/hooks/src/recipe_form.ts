import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { ORPCUtils } from "./orpc-types";
import type { AuthUser } from "./types";

export type IngredientFormRow = { name: string; quantity: string; unit: string };

const DEFAULT_IMAGE_URL =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

function emptyIngredient(): IngredientFormRow {
  return { name: "", quantity: "", unit: "" };
}

export type RecipeFormDeps = {
  orpc: ORPCUtils;
  authClient: {
    useSession: () => { data: { user?: AuthUser } | null; isPending: boolean };
  };
  queryClient: QueryClient;
  recipeId?: number; // absent => création ; présent => édition
  onSaved?: (recipeId: number) => void;
};

export function useRecipeForm({
  orpc,
  authClient,
  queryClient,
  recipeId,
  onSaved,
}: RecipeFormDeps) {
  const isEdit = typeof recipeId === "number" && Number.isInteger(recipeId) && recipeId > 0;
  const { data: session, isPending } = authClient.useSession();
  const isAuthenticated = Boolean(session?.user) && !isPending;

  const totalSteps = 3;
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

  // édition : on récupère la recette à modifier
  const recipeQuery = useQuery({
    ...orpc.recipe.byId.queryOptions({ input: { id: isEdit ? (recipeId as number) : 1 } }),
    enabled: isEdit,
  });
  const recipe = isEdit ? recipeQuery.data ?? null : null;

  // édition : on pré-remplit le formulaire une fois la recette chargée
  useEffect(() => {
    if (!isEdit || !recipe || hasHydratedForm) return;
    setTitle(recipe.title);
    setDescription(recipe.description);
    setPrepTime(String(recipe.prepTime));
    setIsPublic(recipe.isPublic);
    setImageUrl(recipe.imageUrl ?? "");
    setIngredients(
      recipe.ingredients.length
        ? recipe.ingredients.map((ing) => ({
            name: ing.ingredient.name,
            quantity: ing.quantity ?? "",
            unit: ing.unit ?? "",
          }))
        : [emptyIngredient()],
    );
    setSteps(recipe.steps.length ? recipe.steps.map((s) => s.content) : [""]);
    setHasHydratedForm(true);
  }, [isEdit, recipe, hasHydratedForm]);

  function applyError(error: Error, fallback: string) {
    const message = error.message || fallback;
    if (message.toLowerCase().includes("forbidden")) {
      setFormError("Tu ne peux modifier que tes propres recettes.");
      return;
    }
    if (message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("401")) {
      setFormError("Tu dois être connecté(e) pour cette action.");
      return;
    }
    setFormError(message);
  }

  const createRecipe = useMutation(
    orpc.recipe.create.mutationOptions({
      onSuccess: async (created) => {
        setFormError(null);
        await queryClient.invalidateQueries({ queryKey: orpc.recipe.list.queryKey() });
        onSaved?.(created.id);
      },
      onError: (error: Error) => applyError(error, "Impossible de créer la recette."),
    }),
  );

  const updateRecipe = useMutation(
    orpc.recipe.update.mutationOptions({
      onSuccess: async (updated) => {
        setFormError(null);
        await queryClient.invalidateQueries();
        onSaved?.(updated.id);
      },
      onError: (error: Error) => applyError(error, "Impossible de modifier la recette."),
    }),
  );

  const mutation = isEdit ? updateRecipe : createRecipe;

  const cleanedIngredients = useMemo(
    () =>
      ingredients
        .map((ingredient) => {
          const name = ingredient.name.trim();
          const quantity = ingredient.quantity.trim();
          const unit = ingredient.unit.trim();
          if (!name) return null;
          return { name, quantity: quantity || undefined, unit: unit || undefined };
        })
        .filter(Boolean) as Array<{ name: string; quantity?: string; unit?: string }>,
    [ingredients],
  );

  const cleanedSteps = useMemo(() => steps.map((s) => s.trim()).filter(Boolean), [steps]);

  // helpers ingrédients / étapes
  function updateIngredient(index: number, field: keyof IngredientFormRow, value: string) {
    setIngredients((prev) => prev.map((it, i) => (i === index ? { ...it, [field]: value } : it)));
  }
  function addIngredient() {
    setIngredients((prev) => [...prev, emptyIngredient()]);
  }
  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }
  function updateStep(index: number, value: string) {
    setSteps((prev) => prev.map((it, i) => (i === index ? value : it)));
  }
  function addStep() {
    setSteps((prev) => [...prev, ""]);
  }
  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function nextStep() {
    setFormError(null);
    if (currentStep === 1) {
      if (!title.trim()) return setFormError("Le titre est requis.");
      if (!description.trim()) return setFormError("La description est requise.");
      const n = Number(prepTime);
      if (!Number.isInteger(n) || n <= 0) {
        return setFormError("Le temps de préparation doit être un entier positif.");
      }
      if (imageUrl.trim().length > 0) {
        try {
          new URL(imageUrl.trim());
        } catch {
          return setFormError("L'URL de l'image n'est pas valide.");
        }
      }
    }
    if (currentStep === 2 && cleanedIngredients.length === 0) {
      return setFormError("Ajoute au moins un ingrédient.");
    }
    setCurrentStep((p) => Math.min(p + 1, totalSteps));
  }

  function previousStep() {
    setFormError(null);
    setCurrentStep((p) => Math.max(p - 1, 1));
  }

  function submit() {
    setFormError(null);
    if (!session?.user) return setFormError("Tu dois être connecté(e) pour cette action.");
    if (cleanedSteps.length === 0) return setFormError("Ajoute au moins une étape de préparation.");
    const prepTimeNumber = Number(prepTime);
    if (!Number.isInteger(prepTimeNumber) || prepTimeNumber <= 0) {
      return setFormError("Le temps de préparation doit être un entier positif.");
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      isPublic,
      prepTime: prepTimeNumber,
      imageUrl: imageUrl.trim() || DEFAULT_IMAGE_URL,
      ingredients: cleanedIngredients,
      steps: cleanedSteps,
    };

    if (isEdit) {
      updateRecipe.mutate({ id: recipeId as number, ...payload });
    } else {
      createRecipe.mutate(payload);
    }
  }

  return {
    isEdit,
    isAuthenticated,
    recipeQuery,
    recipe,
    isOwner: isEdit ? Boolean(recipe?.isOwner) : true,
    totalSteps,
    currentStep,
    title,
    setTitle,
    description,
    setDescription,
    prepTime,
    setPrepTime,
    isPublic,
    setIsPublic,
    imageUrl,
    setImageUrl,
    ingredients,
    steps,
    updateIngredient,
    addIngredient,
    removeIngredient,
    updateStep,
    addStep,
    removeStep,
    formError,
    nextStep,
    previousStep,
    submit,
    mutation,
  };
}