import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { ORPCUtils } from "./orpc-types";



const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

type SearchFilters = {
  query?: string;
  ingredients?: string[];
  prepTimeMin?: number;
  prepTimeMax?: number;
};

function hasAnyFilter(filters: SearchFilters | null) {
  if (!filters) {
    return false;
  }

  return Boolean(
    filters.query ||
    (filters.ingredients && filters.ingredients.length > 0) ||
    typeof filters.prepTimeMin === "number" ||
    typeof filters.prepTimeMax === "number",
  );
}

export type SearchHookDeps = {
  orpc: ORPCUtils;
};

export function useSearch({ orpc }: SearchHookDeps) {
  const [queryText, setQueryText] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [prepTimeMinText, setPrepTimeMinText] = useState("");
  const [prepTimeMaxText, setPrepTimeMaxText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters | null>(
    null,
  );

  const searchQuery = useQuery({
    ...orpc.recipe.search.queryOptions({
      input: {
        query: appliedFilters?.query,
        ingredients: appliedFilters?.ingredients,
        prepTimeMin: appliedFilters?.prepTimeMin,
        prepTimeMax: appliedFilters?.prepTimeMax,
      },
    }),
    enabled: hasAnyFilter(appliedFilters),
  }); 

  const searchErrorMessage = useMemo(() => {
    if (!searchQuery.isError) {
      return null;
    }

    return searchQuery.error instanceof Error
      ? searchQuery.error.message
      : "Impossible d'effectuer la recherche.";
  }, [searchQuery.error, searchQuery.isError]);

  function applyFilters() {
    const trimmedQuery = queryText.trim();
    const ingredients = ingredientsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const minTime = prepTimeMinText.trim()
      ? Number(prepTimeMinText.trim())
      : undefined;
    const maxTime = prepTimeMaxText.trim()
      ? Number(prepTimeMaxText.trim())
      : undefined;

    if (
      (typeof minTime === "number" &&
        (!Number.isInteger(minTime) || minTime <= 0)) ||
      (typeof maxTime === "number" &&
        (!Number.isInteger(maxTime) || maxTime <= 0))
    ) {
      setFormError("Le temps de preparation doit etre un entier positif.");
      return;
    }

    if (
      typeof minTime === "number" &&
      typeof maxTime === "number" &&
      minTime > maxTime
    ) {
      setFormError(
        "Le temps minimum ne peut pas etre superieur au temps maximum.",
      );
      return;
    }

    const nextFilters: SearchFilters = {
      query: trimmedQuery || undefined,
      ingredients: ingredients.length ? ingredients : undefined,
      prepTimeMin: minTime,
      prepTimeMax: maxTime,
    };

    if (!hasAnyFilter(nextFilters)) {
      setFormError("Ajoute au moins un filtre pour lancer la recherche.");
      return;
    }

    setFormError(null);
    setAppliedFilters(nextFilters);
  }

  function resetFilters() {
    setQueryText("");
    setIngredientsText("");
    setPrepTimeMinText("");
    setPrepTimeMaxText("");
    setAppliedFilters(null);
    setFormError(null);
  }
  return {
    queryText,
    setQueryText,
    ingredientsText,
    setIngredientsText,
    prepTimeMinText,
    setPrepTimeMinText,
    prepTimeMaxText,
    setPrepTimeMaxText,
    formError,
    appliedFilters,
    searchQuery,
    searchErrorMessage,
    applyFilters,
    resetFilters,
    fallbackRecipeImage: FALLBACK_RECIPE_IMAGE,
  };
}
