import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import type { ORPCUtils } from "./orpc-types";
import type { AuthUser } from "./types";

/* ---------- scaling des quantités (pur, partagé web + natif) ---------- */
function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function decimalToFraction(value: number): string {
  const epsilon = 1e-6;
  const whole = Math.floor(value);
  const decimal = value - whole;
  if (decimal < epsilon) return String(whole);
  const denominator = 16;
  const numerator = Math.round(decimal * denominator);
  if (numerator === 0) return String(whole);
  const divisor = gcd(numerator, denominator);
  const reducedNum = numerator / divisor;
  const reducedDen = denominator / divisor;
  if (whole > 0) return `${whole} ${reducedNum}/${reducedDen}`;
  return `${reducedNum}/${reducedDen}`;
}

function parseQuantityPart(part: string): number | null {
  const cleaned = part.trim().replace(",", ".");
  if (!cleaned) return null;
  if (cleaned.includes("/")) {
    const [numRaw, denRaw] = cleaned.split("/");
    const num = Number(numRaw);
    const den = Number(denRaw);
    if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
    return num / den;
  }
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function parseQuantity(quantity: string): number | null {
  const normalized = quantity.trim();
  if (!normalized) return null;
  const parts = normalized.split(/\s+/);
  if (parts.length === 2) {
    const first = parseQuantityPart(parts[0]);
    const second = parseQuantityPart(parts[1]);
    if (first !== null && second !== null) return first + second;
  }
  return parseQuantityPart(normalized);
}

function formatScaledQuantity(value: number): string {
  if (!Number.isFinite(value)) return "";
  const rounded = Math.round(value * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) return String(Math.round(rounded));
  if (rounded > 0 && rounded < 10) return decimalToFraction(rounded);
  return rounded.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

function scaleIngredientQuantity(
  quantity: string | null | undefined,
  fromServings: number,
  toServings: number,
): string | null {
  if (!quantity) return null;
  if (!Number.isFinite(fromServings) || !Number.isFinite(toServings) || fromServings <= 0) {
    return quantity;
  }
  const parsed = parseQuantity(quantity);
  if (parsed === null) return quantity;
  const scaled = (parsed * toServings) / fromServings;
  return formatScaledQuantity(scaled);
}

/* ---------- le hook ---------- */
export type RecipeDetailHookDeps = {
  orpc: ORPCUtils;
  authClient: {
    useSession: () => { data: { user?: AuthUser } | null; isPending: boolean };
  };
  queryClient: QueryClient;
  recipeId: number;
  onDeleted?: () => void;
};

export function useRecipeDetail({
  orpc,
  authClient,
  queryClient,
  recipeId,
  onDeleted,
}: RecipeDetailHookDeps) {
  const hasValidId = Number.isInteger(recipeId) && recipeId > 0;
  const { data: session } = authClient.useSession();

  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [servings, setServings] = useState(2);
  const [isSavePanelOpen, setIsSavePanelOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingCollectionId, setSavingCollectionId] = useState<number | null>(null);

  const recipeQuery = useQuery({
    ...orpc.recipe.byId.queryOptions({ input: { id: hasValidId ? recipeId : 1 } }),
    enabled: hasValidId,
  });

  const recipe = hasValidId ? recipeQuery.data ?? null : null;

  const collectionsQuery = useQuery({
    ...orpc.collection.listMine.queryOptions({
      input: { recipeId: hasValidId ? recipeId : undefined },
    }),
    enabled: isSavePanelOpen && hasValidId && Boolean(session?.user),
  });

  const baseServings = useMemo(() => {
    const maybe = (recipe as { servings?: number } | null)?.servings;
    if (typeof maybe === "number" && Number.isFinite(maybe) && maybe > 0) {
      return Math.round(maybe);
    }
    return 2;
  }, [recipe]);

  useEffect(() => {
    setServings(baseServings);
  }, [baseServings]);

  const deleteRecipe = useMutation(
    orpc.recipe.delete.mutationOptions({
      onSuccess: async () => {
        setDeleteError(null);
        await queryClient.invalidateQueries();
        onDeleted?.();
      },
      onError: (error: Error) => {
        const message = error.message || "Impossible de supprimer la recette.";
        if (message.toLowerCase().includes("forbidden")) {
          setDeleteError("Tu ne peux supprimer que tes propres recettes.");
          return;
        }
        if (message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("401")) {
          setDeleteError("Tu dois être connecté(e) pour supprimer une recette.");
          return;
        }
        setDeleteError(message);
      },
    }),
  );

  const createCollectionMutation = useMutation(
    orpc.collection.create.mutationOptions({
      onSuccess: async () => {
        setSaveError(null);
        setNewCollectionName("");
        await queryClient.invalidateQueries({
          queryKey: orpc.collection.listMine.queryKey({ input: { recipeId } }),
        });
      },
      onError: (error: Error) => {
        setSaveError(error.message || "Impossible de créer la collection.");
      },
    }),
  );

  const addRecipeToCollectionMutation = useMutation(
    orpc.collection.addRecipe.mutationOptions({
      onMutate: (variables) => {
        setSavingCollectionId(variables.collectionId);
      },
      onSuccess: async (_data, variables) => {
        setSaveError(null);
        await queryClient.invalidateQueries({
          queryKey: orpc.collection.listMine.queryKey({ input: { recipeId } }),
        });
        await queryClient.invalidateQueries({
          queryKey: orpc.collection.byId.queryKey({ input: { id: variables.collectionId } }),
        });
      },
      onError: (error: Error) => {
        setSaveError(error.message || "Impossible d'enregistrer la recette dans cette collection.");
      },
      onSettled: () => {
        setSavingCollectionId(null);
      },
    }),
  );

  function confirmDelete() {
    setIsDeleteConfirmOpen(true);
  }
  function cancelDelete() {
    setIsDeleteConfirmOpen(false);
  }
  function performDelete() {
    if (!recipe) return;
    setIsDeleteConfirmOpen(false);
    deleteRecipe.mutate({ id: recipe.id });
  }

  function toggleSavePanel() {
    setSaveError(null);
    setIsSavePanelOpen((previous) => !previous);
  }

  function createCollection() {
    const trimmed = newCollectionName.trim();
    if (!trimmed) {
      setSaveError("Le nom de la collection est obligatoire.");
      return;
    }
    createCollectionMutation.mutate({ name: trimmed });
  }

  function saveToCollection(collectionId: number) {
    if (!recipe) return;
    addRecipeToCollectionMutation.mutate({ collectionId, recipeId: recipe.id });
  }

  function scaleQuantity(quantity: string | null | undefined) {
    return scaleIngredientQuantity(quantity, baseServings, servings);
  }

  function buildShoppingItems(): string[] {
    if (!recipe) return [];
    return recipe.ingredients.map((ingredient) => {
      const scaled = scaleIngredientQuantity(ingredient.quantity, baseServings, servings);
      const quantityText = scaled ? `${scaled} ` : "";
      const unitText = ingredient.unit ? `${ingredient.unit} ` : "";
      return `${quantityText}${unitText}${ingredient.ingredient.name}`.trim();
    });
  }

  const authorLabel = recipe
    ? recipe.author?.username ?? recipe.authorName ?? "Auteur inconnu"
    : "";

  return {
    hasValidId,
    session,
    recipeQuery,
    recipe,
    collectionsQuery,
    baseServings,
    servings,
    setServings,
    incrementServings: () => setServings((p) => p + 1),
    decrementServings: () => setServings((p) => Math.max(1, p - 1)),
    resetServings: () => setServings(baseServings),
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
    addRecipeToCollectionMutation,
  };
}