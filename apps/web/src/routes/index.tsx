import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { useHomePage } from "@my-app/hooks";


export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const {
    recipes,
    recipesErrorMessage,
    fallbackRecipeImage,
  } = useHomePage({ orpc, authClient });

  const recipeItems = recipes.data ?? [];

  return (

    <div className="p-6">
      <div className="flex flex-col gap-4 pb-6">
        <h1 className="text-3xl font-semibold text-foreground">Recettes</h1>
        <p className="text-base text-muted-foreground">
          Découvre des idées simples et clique pour voir le détail.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des recettes...</p>
          ) : null}

          {recipes.isError ? (
            <p className="text-sm text-red-500">Erreur: {recipesErrorMessage}</p>
          ) : null}

          {!recipes.isLoading && !recipes.isError && !recipeItems.length ? (
            <p className="text-sm text-muted-foreground">Aucune recette disponible.</p>
          ) : null}

          {recipeItems.map((recipe) => {
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
                    {recipe.showVisibilityBadge ? (
                      <span
                        className={`inline-flex self-start rounded-full px-2 py-0.5 text-xs font-medium ${recipe.isPublic ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}
                      >
                        {recipe.isPublic ? "Public" : "Privé"}
                      </span>
                    ) : null}

                    <h2 className="text-base font-semibold text-foreground line-clamp-1">
                      {recipe.title}
                    </h2>

                    {recipe.authorName ? (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        Par {recipe.authorName}
                      </p>
                    ) : null}

                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {recipe.description}
                    </p>
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
