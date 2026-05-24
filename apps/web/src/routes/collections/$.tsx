import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { orpc } from "@/utils/orpc";
import { useCollectionDetailsPage } from "@my-app/hooks";

export const Route = createFileRoute("/collections/$")({
  component: CollectionDetailsPage,
});

function CollectionDetailsPage() {
  const navigate = useNavigate();
  const rawId = typeof window !== "undefined"
    ? window.location.pathname.split("/").filter(Boolean).pop()
    : undefined;
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const from = search.get("from") ?? undefined;
  const userId = search.get("userId") ?? undefined;

  const {
    status,
    errorMessage,
    collection,
    handleBack,
    handleRecipePress,
  } = useCollectionDetailsPage(
    { orpc },
    { id: rawId ?? "", from, userId },
    {
      onNavigateBack: () => navigate({ to: "/collections" }),
      onNavigateToRecipe: (recipeId) => navigate({ to: `/recipes/${recipeId}` as any }),
    },
  );

  if (status === "invalid") {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">ID de collection invalide.</p>
      </div>
    );
  }

  if (status === "loading") {
    return <div className="p-6">Chargement...</div>;
  }

  if (status === "error" || !collection) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-500">{errorMessage}</p>
        <button onClick={handleBack} className="underline text-sm">Retour</button>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{collection.name}</h1>
          <p className="text-sm text-muted-foreground">{collection.recipes.length} recette{collection.recipes.length > 1 ? "s" : ""}</p>
        </div>
        <button onClick={handleBack} className="underline text-sm">Retour</button>
      </div>

      {collection.recipes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune recette dans cette collection.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {collection.recipes.map((r: any) => {
            const img = r.imageUrl ?? "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";
            return (
              <article key={r.id} className="overflow-hidden rounded-xl bg-secondary">
                <button onClick={() => handleRecipePress(String(r.id))} className="block w-full text-left">
                  <img src={img} alt={r.title} className="w-full object-cover" style={{ aspectRatio: "16 / 9" }} />
                  <div className="p-3">
                    <h3 className="text-lg font-semibold line-clamp-2">{r.title}</h3>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
