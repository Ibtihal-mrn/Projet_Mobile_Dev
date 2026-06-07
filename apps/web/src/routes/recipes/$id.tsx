import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { useRecipeDetail } from "@my-app/hooks";

const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

export const Route = createFileRoute("/recipes/$id")({
  loader: async ({ context, params }) => {
    const id = Number(params.id);
    if (Number.isInteger(id) && id > 0) {
      await context.queryClient.ensureQueryData(
        context.orpc.recipe.byId.queryOptions({ input: { id } }),
      );
    }
  },
  component: RecipeDetailPage,
});

function RecipeDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    hasValidId,
    recipeQuery,
    recipe,
    collectionsQuery,
    baseServings,
    servings,
    incrementServings,
    decrementServings,
    resetServings,
    scaleQuantity,
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
  } = useRecipeDetail({
    orpc,
    authClient,
    queryClient,
    recipeId: Number(id),
    onDeleted: () => navigate({ to: "/" }),
  });

  if (!hasValidId) {
    return <div className="p-6"><p className="text-lg">Recette introuvable.</p></div>;
  }
  if (recipeQuery.isLoading) {
    return <div className="p-6"><p className="text-base text-muted-foreground">Chargement de la recette...</p></div>;
  }
  if (!recipe) {
    return <div className="p-6"><p className="text-lg">Recette introuvable.</p></div>;
  }

  const imageUrl = recipe.imageUrl ?? FALLBACK_RECIPE_IMAGE;

  return (
    <div className="pb-10">
      <img src={imageUrl} alt={recipe.title} className="h-64 w-full object-cover" />

      <div className="px-6 pt-5 flex flex-col gap-5 max-w-3xl">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">{recipe.title}</h1>
          <p className="text-sm font-medium">Auteur : {authorLabel}</p>
          <p className="text-base">{recipe.description}</p>
          <p className="text-sm">Préparation : {recipe.prepTime} min</p>
          <p className="text-sm">Portions de base : {baseServings}</p>

          {recipe.showVisibilityBadge ? (
            <span className="self-start rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              {recipe.isPublic ? "Public" : "Privé (amis)"}
            </span>
          ) : null}

          {deleteError ? <p className="text-sm text-red-500">{deleteError}</p> : null}

          {recipe.isOwner ? (
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                disabled={deleteRecipe.isPending}
                className="self-start px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm disabled:opacity-50"
              >
                {deleteRecipe.isPending ? "..." : "Supprimer"}
              </button>
            </div>
          ) : null}

          {isDeleteConfirmOpen ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-red-300 bg-red-50 p-4">
              <p className="text-base font-semibold">Supprimer la recette ?</p>
              <p className="text-sm">Cette action est définitive.</p>
              <div className="flex gap-2">
                <button
                  onClick={cancelDelete}
                  disabled={deleteRecipe.isPending}
                  className="self-start px-4 py-2 rounded-lg border text-sm disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={performDelete}
                  disabled={deleteRecipe.isPending}
                  className="self-start px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm disabled:opacity-50"
                >
                  {deleteRecipe.isPending ? "..." : "Confirmer"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={toggleSavePanel}
            className="self-start px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
          >
            {isSavePanelOpen ? "Fermer" : "Enregistrer"}
          </button>

          {isSavePanelOpen ? (
            <div className="flex flex-col gap-3 rounded-xl bg-secondary p-4">
              <h2 className="text-base font-semibold">Enregistrer dans une collection</h2>
              {saveError ? <p className="text-sm text-red-500">{saveError}</p> : null}

              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Nom de la nouvelle collection"
                  onKeyDown={(e) => e.key === "Enter" && createCollection()}
                />
                <button
                  onClick={createCollection}
                  disabled={createCollectionMutation.isPending}
                  className="px-4 py-2 rounded-lg border text-sm disabled:opacity-50"
                >
                  {createCollectionMutation.isPending ? "..." : "Créer"}
                </button>
              </div>

              {collectionsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : null}

              {collectionsQuery.data?.map((collection) => {
                const isSaving = savingCollectionId === collection.id;
                return (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between rounded-lg bg-background px-3 py-2"
                  >
                    <div className="pr-2">
                      <p className="text-sm font-medium">{collection.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {collection.recipesCount} recette{collection.recipesCount > 1 ? "s" : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => saveToCollection(collection.id)}
                      disabled={isSaving || collection.hasRecipe}
                      className="px-3 py-1 text-sm rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                    >
                      {isSaving ? "..." : collection.hasRecipe ? "Déjà enregistrée" : "Enregistrer"}
                    </button>
                  </div>
                );
              })}

              {!collectionsQuery.isLoading && !collectionsQuery.data?.length ? (
                <p className="text-sm text-muted-foreground">
                  Crée d'abord une collection puis enregistre ta recette.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Adapter les portions</h2>
          <div className="flex items-center gap-3">
            <button onClick={decrementServings} disabled={servings <= 1} className="px-3 py-1 rounded-lg border disabled:opacity-50">-</button>
            <span className="text-base">{servings} personne{servings > 1 ? "s" : ""}</span>
            <button onClick={incrementServings} className="px-3 py-1 rounded-lg border">+</button>
            <button onClick={resetServings} className="px-3 py-1 rounded-lg border">Reset</button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Ingrédients</h2>
          {recipe.ingredients.map((ingredient) => {
            const scaledQuantity = scaleQuantity(ingredient.quantity);
            return (
              <p key={ingredient.id} className="text-base">
                • {scaledQuantity ? `${scaledQuantity} ` : ""}
                {ingredient.unit ? `${ingredient.unit} ` : ""}
                {ingredient.ingredient.name}
              </p>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 pb-8">
          <h2 className="text-xl font-semibold">Préparation</h2>
          {recipe.steps.map((step) => (
            <p key={step.id} className="text-base">
              {step.stepOrder}. {step.content}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}