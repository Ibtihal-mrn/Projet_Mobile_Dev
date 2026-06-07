import { createFileRoute, Link } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { useMyRecipesPage } from "@my-app/hooks";

export const Route = createFileRoute("/my_recipes")({
  component: MyRecipesPage,
});

function MyRecipesPage() {
  const {
    session,
    recipes,
    recipesErrorMessage,
    fallbackRecipeImage,
  } = useMyRecipesPage({ orpc, authClient });

  if (!session?.user) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <h1 className="text-3xl font-semibold">Mes recettes</h1>
        <p className="text-sm text-muted-foreground">
          Connecte-toi pour voir les recettes que tu as créées.
        </p>
        <Link to="/login" className="underline text-sm">Se connecter</Link>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <div>
      <h1 className="text-3xl font-semibold">Mes recettes</h1>
      <p className="text-sm text-muted-foreground">
        Retrouve uniquement les recettes que tu as créées.
      </p>
      </div>
      <Link
          to="/recipes/new"
          className="shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          + Nouvelle recette
        </Link>

      {recipes.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement des recettes...</p>
      ) : null}

      {recipes.isError ? (
        <p className="text-sm text-red-500">Erreur: {recipesErrorMessage}</p>
      ) : null}

      {!recipes.isLoading && !recipes.isError && !recipes.data?.length ? (
        <p className="text-sm text-muted-foreground">Aucune recette disponible.</p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.data?.map((recipe) => {
          const imageUrl = recipe.imageUrl ?? fallbackRecipeImage;

          return (

            <Link
              key={recipe.id}
              to="/recipes/$id"
              params={{ id: String(recipe.id) }}
              className="rounded-xl bg-secondary overflow-hidden block hover:-translate-y-0.5 transition-transform"
            >
              
            <article
              key={recipe.id}
              className="rounded-xl bg-secondary overflow-hidden"
            >
              <img
                src={imageUrl}
                alt={recipe.title}
                className="w-full object-cover"
                style={{ aspectRatio: "1 / 1" }}
              />

              <div className="p-3 flex flex-col gap-1">
                {recipe.showVisibilityBadge ? (
                  <span
                    className={`inline-block self-start rounded-full px-2 py-0.5 text-xs font-medium ${recipe.isPublic ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {recipe.isPublic ? "Public" : "Privé"}
                  </span>
                ) : null}

                <h2 className="text-base font-semibold truncate">{recipe.title}</h2>

                {recipe.authorName ? (
                  <p className="text-xs text-muted-foreground truncate">Par {recipe.authorName}</p>
                ) : null}

                <p className="text-xs line-clamp-2">{recipe.description}</p>
              </div>
            </article>
          
          </Link>

          );
        })}
      </div>
    </div>
  );
}
