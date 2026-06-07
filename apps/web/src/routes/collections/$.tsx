import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCollectionDetailsPage } from "@my-app/hooks";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/collections/$")({
  component: CollectionDetailsPage,
});

function CollectionDetailsPage() {
  const navigate = useNavigate();
  const params = Route.useParams() as { _splat?: string };

  const {
    status,
    errorMessage,
    collection,
    fallbackRecipeImage,
    handleBack,
  } = useCollectionDetailsPage({
    orpc,
    collectionId: params._splat ?? "",
    onNavigateBack: () => navigate({ to: "/collections" }),
    onNavigateToRecipe: (recipeId: string) => navigate({ to: "/recipes/$id", params: { id: recipeId } }),
  });

  if (status === "invalid") {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">ID de collection invalide.</p>
        <button onClick={handleBack} className="mt-4 text-sm underline">
          Retour
        </button>
      </div>
    );
  }

  if (status === "loading") {
    return <div className="p-6 text-sm text-muted-foreground">Chargement...</div>;
  }

  if (status === "error" || !collection) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">{errorMessage ?? "Collection introuvable."}</p>
        <button onClick={handleBack} className="mt-4 text-sm underline">
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">{collection.name}</h1>
          <p className="text-sm text-muted-foreground">
            {collection.recipes.length} recette{collection.recipes.length > 1 ? "s" : ""}
          </p>
        </div>

        <Link to="/collections" className="self-start text-sm text-blue-500">
        ← Retour à mes collections
      </Link>
      </div>

      {collection.recipes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Cette collection est vide pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {collection.recipes.map((recipe: {
            id: number;
            title: string;
            description: string;
            imageUrl: string | null;
            isPublic: boolean;
            authorName: string | null;
            showVisibilityBadge: boolean;
          }) => {
            const imageUrl = recipe.imageUrl ?? fallbackRecipeImage;

            return (
              <Link
                key={recipe.id}
                to="/recipes/$id"
                  params={{ id: String(recipe.id) }}
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
                        {recipe.isPublic ? "Public" : "Prive"}
                      </span>
                    ) : null}

                    <h2 className="text-base font-semibold text-foreground line-clamp-1">
                      {recipe.title}
                    </h2>

                    {recipe.authorName ? (
                      <p className="text-xs text-muted-foreground line-clamp-1">Par {recipe.authorName}</p>
                    ) : null}

                    <p className="text-xs text-muted-foreground line-clamp-2">{recipe.description}</p>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}