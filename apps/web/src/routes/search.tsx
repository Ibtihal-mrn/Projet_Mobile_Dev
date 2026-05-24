import { createFileRoute, Link } from "@tanstack/react-router";
import { useSearch } from "@my-app/hooks";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/search")({
  component: SearchPage,
});

function SearchPage() {
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

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 pb-8">
        <h1 className="text-3xl font-semibold text-foreground">Recherche recettes</h1>
        <p className="text-sm text-muted-foreground">
          Filtre par mot-cle, ingredients et temps de preparation.
        </p>

        <div className="flex flex-col gap-3 rounded-xl bg-secondary p-4">
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder="Mot-cle (ex: pasta, chocolat...)"
            autoCorrect="off"
            onKeyDown={(event) => event.key === "Enter" && applyFilters()}
          />

          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
            value={ingredientsText}
            onChange={(event) => setIngredientsText(event.target.value)}
            placeholder="Ingredients (ex: tomate, basilic, ail)"
            autoCorrect="off"
          />

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
                value={prepTimeMinText}
                onChange={(event) => setPrepTimeMinText(event.target.value)}
                placeholder="Temps min (min)"
                inputMode="numeric"
              />
            </div>
            <div className="flex-1">
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none ring-0 focus:border-primary"
                value={prepTimeMaxText}
                onChange={(event) => setPrepTimeMaxText(event.target.value)}
                placeholder="Temps max (min)"
                inputMode="numeric"
              />
            </div>
          </div>

          {formError ? <p className="text-sm text-red-500">{formError}</p> : null}

          <div className="flex gap-2">
            <button
              type="button"
              className="self-start rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
              onClick={applyFilters}
            >
              Rechercher
            </button>
            <button
              type="button"
              className="self-start rounded-lg border border-border px-4 py-2 text-sm"
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>
        </div>

        {searchQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : null}

        {searchErrorMessage ? <p className="text-sm text-red-500">{searchErrorMessage}</p> : null}

        {appliedFilters && !searchQuery.isLoading && !searchQuery.isError && !searchQuery.data?.length ? (
          <p className="text-sm text-muted-foreground">Aucune recette trouvee avec ces filtres.</p>
        ) : null}

        {!appliedFilters ? (
          <p className="text-sm text-muted-foreground">
            Configure tes filtres puis appuie sur Rechercher.
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(searchQuery.data ?? []).map((recipe) => {
            const imageUrl = recipe.imageUrl ?? fallbackRecipeImage;

            return (
              <Link
                key={recipe.id}
                to={`/recipes/${recipe.id}` as any}
                className="group overflow-hidden rounded-xl bg-secondary transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <article className="flex h-full flex-col overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={recipe.title}
                    className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />

                  <div className="flex flex-1 flex-col gap-1 p-3">
                    <p className="text-xs text-muted-foreground">{recipe.prepTime} min</p>

                    {recipe.showVisibilityBadge ? (
                      <span
                        className={`inline-flex self-start rounded-full px-2 py-0.5 text-xs font-medium ${recipe.isPublic ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}
                      >
                        {recipe.isPublic ? "Public" : "Prive"}
                      </span>
                    ) : null}

                    <h2 className="text-base font-semibold text-foreground line-clamp-1">
                      {recipe.title}
                    </h2>

                    {recipe.authorName ? (
                      <p className="text-xs text-foreground line-clamp-1">Par {recipe.authorName}</p>
                    ) : null}

                    <p className="text-xs text-foreground line-clamp-2">{recipe.description}</p>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
