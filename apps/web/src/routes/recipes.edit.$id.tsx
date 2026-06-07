import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { useRecipeForm } from "@my-app/hooks";
import { RecipeFormView } from "./recipes/new";

export const Route = createFileRoute("/recipes/edit/$id")({
  ssr: false,
  component: EditRecipePage,
});

function EditRecipePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useRecipeForm({
    orpc,
    authClient,
    queryClient,
    recipeId: Number(id),
    onSaved: (rid) => navigate({ to: "/recipes/$id", params: { id: String(rid) } }),
  });

  if (!form.isAuthenticated) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <h1 className="text-3xl font-semibold">Modifier la recette</h1>
        <p className="text-sm text-muted-foreground">Connecte-toi pour modifier une recette.</p>
        <Link to="/login" className="underline text-sm">Se connecter</Link>
      </div>
    );
  }
  if (form.recipeQuery.isLoading) {
    return <div className="p-6"><p className="text-sm text-muted-foreground">Chargement...</p></div>;
  }
  if (!form.recipe) {
    return <div className="p-6"><p className="text-lg">Recette introuvable.</p></div>;
  }
  if (!form.isOwner) {
    return (
      <div className="p-6 flex flex-col gap-2">
        <p className="text-lg">Accès refusé.</p>
        <p className="text-sm text-muted-foreground">Tu ne peux modifier que tes propres recettes.</p>
      </div>
    );
  }

  return <RecipeFormView form={form} title="Modifier la recette" submitLabel="Enregistrer" />;
}