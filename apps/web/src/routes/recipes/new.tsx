import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { orpc } from "@/utils/orpc";
import { useRecipeForm } from "@my-app/hooks";

export const Route = createFileRoute("/recipes/new")({
  ssr: false,
  component: NewRecipePage,
});

function NewRecipePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useRecipeForm({
    orpc,
    authClient,
    queryClient,
    onSaved: (id) => navigate({ to: "/recipes/$id", params: { id: String(id) } }),
  });

  if (!form.isAuthenticated) {
    return (
      <div className="p-6 flex flex-col gap-4">
        <h1 className="text-3xl font-semibold">Nouvelle recette</h1>
        <p className="text-sm text-muted-foreground">Connecte-toi pour publier une recette.</p>
        <Link to="/login" className="underline text-sm">Se connecter</Link>
      </div>
    );
  }

  return <RecipeFormView form={form} title="Nouvelle recette" submitLabel="Créer la recette" />;
}

export { RecipeFormView };

function RecipeFormView({
  form,
  title,
  submitLabel,
}: {
  form: ReturnType<typeof useRecipeForm>;
  title: string;
  submitLabel: string;
}) {
  const { currentStep, totalSteps, mutation } = form;

  return (
    <div className="p-6 flex flex-col gap-4 max-w-2xl">
        
        <Link to="/my_recipes" className="self-start text-sm text-blue-500">
        ← Retour à mes recettes
      </Link>
      
      <h1 className="text-3xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">Étape {currentStep}/{totalSteps}</p>

      {form.formError || mutation.isError ? (
        <p className="text-sm text-red-500">
          {form.formError || (mutation.error?.message ?? "Une erreur est survenue.")}
        </p>
      ) : null}

      {currentStep === 1 ? (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Titre *</span>
            <input className="border rounded-lg px-3 py-2 text-sm" value={form.title}
              onChange={(e) => form.setTitle(e.target.value)} placeholder="Ex: Lasagnes maison" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Description *</span>
            <textarea className="border rounded-lg px-3 py-2 text-sm" value={form.description}
              onChange={(e) => form.setDescription(e.target.value)} placeholder="Décris la recette" />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Temps de préparation (min) *</span>
            <input type="number" className="border rounded-lg px-3 py-2 text-sm" value={form.prepTime}
              onChange={(e) => form.setPrepTime(e.target.value)} placeholder="30" />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Visibilité</span>
            <div className="flex gap-2">
              <button onClick={() => form.setIsPublic(true)} disabled={form.isPublic}
                className="px-3 py-1 rounded-lg border text-sm disabled:opacity-50">Public</button>
              <button onClick={() => form.setIsPublic(false)} disabled={!form.isPublic}
                className="px-3 py-1 rounded-lg border text-sm disabled:opacity-50">Amis uniquement</button>
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Image URL (optionnel)</span>
            <input className="border rounded-lg px-3 py-2 text-sm" value={form.imageUrl}
              onChange={(e) => form.setImageUrl(e.target.value)} placeholder="https://..." />
          </label>
        </div>
      ) : null}

      {currentStep === 2 ? (
        <div className="flex flex-col gap-3">
          {form.ingredients.map((ingredient, index) => (
            <div key={`ing-${index}`} className="flex flex-col gap-2 rounded-lg border p-3">
              <span className="text-sm font-medium">Ingrédient {index + 1}</span>
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Nom *" value={ingredient.name}
                onChange={(e) => form.updateIngredient(index, "name", e.target.value)} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Quantité (opt.)" value={ingredient.quantity}
                onChange={(e) => form.updateIngredient(index, "quantity", e.target.value)} />
              <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Unité (opt.)" value={ingredient.unit}
                onChange={(e) => form.updateIngredient(index, "unit", e.target.value)} />
              {form.ingredients.length > 1 ? (
                <button onClick={() => form.removeIngredient(index)} className="self-start text-sm text-red-500">
                  Supprimer cet ingrédient
                </button>
              ) : null}
            </div>
          ))}
          <button onClick={form.addIngredient} className="self-start px-3 py-1 rounded-lg border text-sm">
            + Ajouter un ingrédient
          </button>
        </div>
      ) : null}

      {currentStep === 3 ? (
        <div className="flex flex-col gap-3">
          {form.steps.map((step, index) => (
            <div key={`step-${index}`} className="flex flex-col gap-2 rounded-lg border p-3">
              <span className="text-sm font-medium">Étape {index + 1}</span>
              <textarea className="border rounded-lg px-3 py-2 text-sm" placeholder="Décris l'étape" value={step}
                onChange={(e) => form.updateStep(index, e.target.value)} />
              {form.steps.length > 1 ? (
                <button onClick={() => form.removeStep(index)} className="self-start text-sm text-red-500">
                  Supprimer cette étape
                </button>
              ) : null}
            </div>
          ))}
          <button onClick={form.addStep} className="self-start px-3 py-1 rounded-lg border text-sm">
            + Ajouter une étape
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-2">
        <button onClick={form.previousStep} disabled={currentStep === 1 || mutation.isPending}
          className="px-4 py-2 rounded-lg border text-sm disabled:opacity-50">Précédent</button>

        {currentStep < totalSteps ? (
          <button onClick={form.nextStep} disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">Suivant</button>
        ) : (
          <button onClick={form.submit} disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">
            {mutation.isPending ? "..." : submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}