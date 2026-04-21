import { Link } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Input, Spinner, TextField } from "heroui-native";
import { useMemo, useState } from "react";
import { Image, Text, View, useWindowDimensions } from "react-native";

import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";

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

export default function SearchScreen() {
  const { width } = useWindowDimensions();

  const [queryText, setQueryText] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");
  const [prepTimeMinText, setPrepTimeMinText] = useState("");
  const [prepTimeMaxText, setPrepTimeMaxText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters | null>(null);

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

  const SCREEN_PADDING = 24;
  const GAP = 12;
  const columns = width < 420 ? 1 : width < 768 ? 2 : 3;
  const availableWidth = width - SCREEN_PADDING * 2 - GAP * (columns - 1);
  const cardWidth = availableWidth / columns;

  function applyFilters() {
    const trimmedQuery = queryText.trim();
    const ingredients = ingredientsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const minTime = prepTimeMinText.trim() ? Number(prepTimeMinText.trim()) : undefined;
    const maxTime = prepTimeMaxText.trim() ? Number(prepTimeMaxText.trim()) : undefined;

    if (
      (typeof minTime === "number" && (!Number.isInteger(minTime) || minTime <= 0)) ||
      (typeof maxTime === "number" && (!Number.isInteger(maxTime) || maxTime <= 0))
    ) {
      setFormError("Le temps de preparation doit etre un entier positif.");
      return;
    }

    if (
      typeof minTime === "number" &&
      typeof maxTime === "number" &&
      minTime > maxTime
    ) {
      setFormError("Le temps minimum ne peut pas etre superieur au temps maximum.");
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

  return (
    <Container className="p-6">
      <View className="gap-4 pb-8">
        <Text className="text-3xl font-semibold text-foreground">Recherche recettes</Text>
        <Text className="text-sm text-muted-foreground">
          Filtre par mot-cle, ingredients et temps de preparation.
        </Text>

        <View className="gap-3 rounded-xl bg-secondary p-4">
          <TextField>
            <Input
              value={queryText}
              onChangeText={setQueryText}
              placeholder="Mot-cle (ex: pasta, chocolat...)"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={applyFilters}
            />
          </TextField>

          <TextField>
            <Input
              value={ingredientsText}
              onChangeText={setIngredientsText}
              placeholder="Ingredients (ex: tomate, basilic, ail)"
              autoCorrect={false}
              returnKeyType="done"
            />
          </TextField>

          <View className="flex-row gap-2">
            <View className="flex-1">
              <TextField>
                <Input
                  value={prepTimeMinText}
                  onChangeText={setPrepTimeMinText}
                  placeholder="Temps min (min)"
                  keyboardType="number-pad"
                />
              </TextField>
            </View>
            <View className="flex-1">
              <TextField>
                <Input
                  value={prepTimeMaxText}
                  onChangeText={setPrepTimeMaxText}
                  placeholder="Temps max (min)"
                  keyboardType="number-pad"
                />
              </TextField>
            </View>
          </View>

          {formError ? <Text className="text-sm text-danger">{formError}</Text> : null}

          <View className="flex-row gap-2">
            <Button className="self-start" onPress={applyFilters}>
              <Button.Label>Rechercher</Button.Label>
            </Button>
            <Button className="self-start" variant="outline" onPress={resetFilters}>
              <Button.Label>Reset</Button.Label>
            </Button>
          </View>
        </View>

        {searchQuery.isLoading ? (
          <View className="items-center py-3">
            <Spinner size="lg" color="default" />
          </View>
        ) : null}

        {searchErrorMessage ? <Text className="text-sm text-danger">{searchErrorMessage}</Text> : null}

        {appliedFilters && !searchQuery.isLoading && !searchQuery.isError && !searchQuery.data?.length ? (
          <Text className="text-sm text-muted-foreground">Aucune recette trouvee avec ces filtres.</Text>
        ) : null}

        {!appliedFilters ? (
          <Text className="text-sm text-muted-foreground">
            Configure tes filtres puis appuie sur Rechercher.
          </Text>
        ) : null}

        <View className="flex-row flex-wrap">
          {searchQuery.data?.map((recipe, index) => {
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
                      style={{ width: cardWidth, height: cardWidth }}
                      resizeMode="cover"
                    />

                    <View className="p-3 gap-1">
                      <Text className="text-xs text-muted-foreground">{recipe.prepTime} min</Text>
                      {recipe.showVisibilityBadge ? (
                        <View
                          className={`self-start rounded-full px-2 py-0.5 mb-1 ${recipe.isPublic ? "bg-success/20" : "bg-warning/20"}`}
                        >
                          <Text className={`text-xs font-medium ${recipe.isPublic ? "text-success" : "text-warning"}`}>
                            {recipe.isPublic ? "Public" : "Prive"}
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
    </Container>
  );
}
