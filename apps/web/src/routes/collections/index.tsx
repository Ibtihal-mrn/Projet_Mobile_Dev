import { createFileRoute, Link } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { useQueryClient } from "@tanstack/react-query";
import { useCollectionPage } from "@my-app/hooks";

export const Route = createFileRoute("/collections/")({
  ssr : false,
  component: CollectionsPage,
});



function CollectionsPage() {
  const queryClient = useQueryClient();
  const {
    session,
    collectionsQuery,
    collectionsErrorMessage,
    actionError,
    newCollectionName,
    setNewCollectionName,
    createCollection,
    createCollectionMutation,
    fallbackRecipeImage,
  } = useCollectionPage({ orpc, authClient, queryClient });

  if (!session?.user) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <h1 className="text-3xl font-semibold">Collections</h1>
        <p className="text-sm text-muted-foreground">
          Connecte-toi pour creer et organiser tes collections de recettes.
        </p>
        <Link to="/login" className="underline text-sm">Se connecter</Link>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      <h1 className="text-3xl font-semibold">Collections</h1>
      <p className="text-sm text-muted-foreground">
        Cree des collections comme sur Pinterest et range tes recettes preferees.
      </p>

      {actionError ? <p className="text-sm text-red-500">{actionError}</p> : null}

      <div className="rounded-xl bg-secondary p-4 flex flex-col gap-2">
        <h2 className="text-base font-semibold">Nouvelle collection</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            placeholder="Ex: Brunch du dimanche"
            autoCorrect="off"
            onKeyDown={(e) => e.key === "Enter" && createCollection()}
          />
          <button
            onClick={createCollection}
            disabled={createCollectionMutation.isPending}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            {createCollectionMutation.isPending ? "..." : "Creer"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">Mes collections</h2>

        {collectionsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : null}

        {collectionsErrorMessage ? (
          <p className="text-sm text-red-500">{collectionsErrorMessage}</p>
        ) : null}

        {!collectionsQuery.isLoading && !collectionsQuery.isError && !collectionsQuery.data?.length ? (
          <p className="text-sm text-muted-foreground">Aucune collection pour le moment.</p>
        ) : null}

        {collectionsQuery.data && collectionsQuery.data.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {collectionsQuery.data.map((collection) => {
              const collectionImage = collection.imageUrls?.[0] ?? fallbackRecipeImage;

              return (

                <Link
                  key={collection.id}
                  to="/collections/$"
                  params={{ _splat: String(collection.id) }}
                  className="block overflow-hidden rounded-xl bg-secondary transition-transform hover:-translate-y-0.5 hover:shadow-lg"
                >
    
                <article key={collection.id} className="overflow-hidden rounded-xl bg-secondary">
                  <div className="relative">
                    <img
                      src={collectionImage}
                      alt={collection.name}
                      className="w-full object-cover"
                      style={{ aspectRatio: "1 / 1" }}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/4 bg-black/50" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <h3 className="text-lg font-semibold text-white line-clamp-2">{collection.name}</h3>
                      <p className="text-xs text-gray-100">
                        {collection.recipesCount} recette{collection.recipesCount > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </article>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
