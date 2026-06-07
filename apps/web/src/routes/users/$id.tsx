import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { useUserProfile, relationLabel } from "@my-app/hooks";

const FALLBACK_RECIPE_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80";

export const Route = createFileRoute("/users/$id")({
  ssr: false,
  component: UserProfilePage,
});

function UserProfilePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { hasValidId, profileQuery, profile, removeFriend, removeCurrentFriend } = useUserProfile({
    orpc,
    queryClient,
    profileUserId: Number(id),
    onRemoved: () => navigate({ to: "/amis" }),
  });

  if (!hasValidId) {
    return <div className="p-6"><p className="text-lg">Profil introuvable.</p></div>;
  }
  if (profileQuery.isLoading) {
    return <div className="p-6"><p className="text-base text-muted-foreground">Chargement du profil...</p></div>;
  }
  if (profileQuery.isError || !profile) {
    const message =
      profileQuery.error instanceof Error ? profileQuery.error.message : "Profil introuvable.";
    return (
      <div className="p-6 flex flex-col gap-2">
        <p className="text-lg">Profil introuvable.</p>
        <p className="text-sm text-red-500">{message}</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5 max-w-4xl">
      <button
        onClick={() => navigate({ to: "/amis" })}
        className="self-start text-sm text-blue-500"
      >
        ← Retour aux amis
      </button>
      <div className="flex items-center gap-4 rounded-3xl bg-secondary p-4">
        <img src={profile.avatarUrl} alt={profile.username} className="h-20 w-20 rounded-full object-cover bg-background" />
        <div className="flex flex-1 flex-col gap-2">
          <h1 className="text-3xl font-semibold">{profile.username}</h1>
          <span className="self-start rounded-full bg-background px-3 py-1 text-xs font-medium">
            {relationLabel(profile.relationStatus)}
          </span>
          <p className="text-sm">
            {profile.canSeePrivateContent
              ? "Tu vois ses recettes privées parce que vous êtes amis."
              : "Tu vois seulement ses contenus publics. Deviens ami pour accéder au reste."}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-secondary p-4 w-48">
        <p className="text-xs uppercase tracking-wide">Recettes personnelles</p>
        <p className="mt-1 text-2xl font-semibold">{profile.recipes.length}</p>
      </div>

      {!profile.recipes.length ? (
        <p className="text-sm">Aucune recette créée pour le moment.</p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {profile.recipes.map((recipe) => {
          const imageUrl = recipe.imageUrl ?? FALLBACK_RECIPE_IMAGE;
          return (
            <a
              key={recipe.id}
              href={`/recipes/${recipe.id}`}
              className="group overflow-hidden rounded-xl bg-secondary transition-transform hover:-translate-y-0.5"
            >
              <img src={imageUrl} alt={recipe.title} className="aspect-video w-full object-cover" />
              <div className="flex flex-col gap-1 p-3">
                <p className="text-xs text-muted-foreground">{recipe.prepTime} min</p>
                {recipe.showVisibilityBadge ? (
                  <span className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${recipe.isPublic ? "bg-success/20 text-success" : "bg-warning/20 text-warning"}`}>
                    {recipe.isPublic ? "Public" : "Privé"}
                  </span>
                ) : null}
                <h2 className="text-base font-semibold line-clamp-1">{recipe.title}</h2>
                <p className="text-xs text-muted-foreground line-clamp-2">{recipe.description}</p>
              </div>
            </a>
          );
        })}
      </div>

      {profile.relationStatus === "friend" ? (
        <div className="flex justify-center pt-2">
          <button
            onClick={removeCurrentFriend}
            disabled={removeFriend.isPending}
            className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm disabled:opacity-50"
          >
            {removeFriend.isPending ? "..." : "Supprimer l'ami"}
          </button>
        </div>
      ) : null}
    </div>
  );
}