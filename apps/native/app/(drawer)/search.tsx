import { Link } from "expo-router";
import { Button, Card, Input, Spinner, TextField } from "heroui-native";
import { Image, Text, View, useWindowDimensions, Pressable } from "react-native";
import { Container } from "@/components/container";
import { orpc } from "@/utils/orpc";
import { useSearch } from "@my-app/hooks";



export default function SearchScreen() {
  const { width } = useWindowDimensions();
  const {
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
    fallbackRecipeImage,
  } = useSearch({ orpc });


  const SCREEN_PADDING = 24;
  const GAP = 12;
  const columns = width < 420 ? 1 : width < 768 ? 2 : 3;
  const availableWidth = width - SCREEN_PADDING * 2 - GAP * (columns - 1);
  const cardWidth = availableWidth / columns;





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
            const imageUrl = recipe.imageUrl ?? fallbackRecipeImage;

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
                  <Pressable style={{ width: cardWidth }}>
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
                  </Pressable>
                </Link>
              </View>
            );
          })}
        </View>
      </View>
    </Container>
  );
}
