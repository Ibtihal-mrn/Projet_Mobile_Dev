import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { orpc, queryClient } from "@/utils/orpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

type RecipeFormIngredient = {
  mode: "existing" | "new";
  ingredientId?: number;
  name?: string;
  quantity?: string;
  unit?: string;
};

function HomeComponent() {
  const [ingredientName, setIngredientName] = useState("");
  const [recipeTitle, setRecipeTitle] = useState("");
  const [recipeDescription, setRecipeDescription] = useState("");
  const [recipePrepTime, setRecipePrepTime] = useState<number>(10);
  const [steps, setSteps] = useState<string[]>([""]);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeFormIngredient[]>([
    { mode: "existing", ingredientId: undefined, quantity: "", unit: "" },
  ]);

  const healthCheck = useQuery(orpc.healthCheck.queryOptions());
  const ingredients = useQuery(orpc.ingredients.list.queryOptions());
  const ingredientOptions = useMemo(() => ingredients.data ?? [], [ingredients.data]);

  const addIngredient = useMutation(
    orpc.ingredients.create.mutationOptions({
      onSuccess: () => {
        setIngredientName("");
        queryClient.invalidateQueries({
          queryKey: orpc.ingredients.list.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const createRecipe = useMutation(
    orpc.recipe.create.mutationOptions({
      onSuccess: () => {
        toast.success("Recipe created");
        setRecipeTitle("");
        setRecipeDescription("");
        setRecipePrepTime(10);
        setSteps([""]);
        setRecipeIngredients([{ mode: "existing", ingredientId: undefined, quantity: "", unit: "" }]);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const handleAddIngredient = () => {
    const trimmedName = ingredientName.trim();
    if (!trimmedName) {
      toast.error("Please enter an ingredient name");
      return;
    }

    addIngredient.mutate({ name: trimmedName });
  };

  const addStepRow = () => setSteps((prev) => [...prev, ""]);
  const removeStepRow = (idx: number) =>
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  const updateStep = (idx: number, value: string) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? value : s)));

  const addRecipeIngredientRow = () =>
    setRecipeIngredients((prev) => [
      ...prev,
      { mode: "existing", ingredientId: undefined, quantity: "", unit: "" },
    ]);

  const removeRecipeIngredientRow = (idx: number) =>
    setRecipeIngredients((prev) => prev.filter((_, i) => i !== idx));

  const updateRecipeIngredient = (idx: number, patch: Partial<RecipeFormIngredient>) =>
    setRecipeIngredients((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );

  const handleCreateRecipe = () => {
    const title = recipeTitle.trim();
    const description = recipeDescription.trim();

    if (!title) return toast.error("Title is required");
    if (!description) return toast.error("Description is required");
    if (!Number.isFinite(recipePrepTime) || recipePrepTime <= 0) {
      return toast.error("prepTime must be > 0");
    }

    const cleanSteps = steps.map((s) => s.trim()).filter(Boolean);
    if (cleanSteps.length === 0) return toast.error("At least 1 step is required");

    const payloadIngredients = recipeIngredients
      .map((row) => {
        const quantity = row.quantity?.trim() || undefined;
        const unit = row.unit?.trim() || undefined;

        if (row.mode === "existing") {
          if (!row.ingredientId) return null;
          return { ingredientId: row.ingredientId, quantity, unit };
        }

        const name = row.name?.trim();
        if (!name) return null;
        return { name, quantity, unit };
      })
      .filter(Boolean) as Array<
      { ingredientId: number; quantity?: string; unit?: string } | { name: string; quantity?: string; unit?: string }
      >;

    if (payloadIngredients.length === 0) {
      return toast.error("At least 1 ingredient is required");
    }

    createRecipe.mutate({
      title,
      description,
      prepTime: recipePrepTime,
      steps: cleanSteps,
      ingredients: payloadIngredients,
    });
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-2">
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>API Status</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {healthCheck.isLoading
              ? "Checking..."
              : healthCheck.data
                ? "Connected"
                : "Disconnected"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ingredient name"
                value={ingredientName}
                onChange={(event) => setIngredientName(event.target.value)}
              />
              <Button onClick={handleAddIngredient} disabled={addIngredient.isPending}>
                {addIngredient.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
            <div>
              {ingredients.isLoading ? (
                <p className="text-muted-foreground">Loading ingredients...</p>
              ) : ingredients.data && ingredients.data.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4">
                  {ingredients.data.map((ingredient) => (
                    <li key={ingredient.id}>{ingredient.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No ingredients yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Recipe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3">
              <Input
                placeholder="Title (e.g. Pasta carbonara)"
                value={recipeTitle}
                onChange={(e) => setRecipeTitle(e.target.value)}
              />
              <Input
                placeholder="Description"
                value={recipeDescription}
                onChange={(e) => setRecipeDescription(e.target.value)}
              />
              <Input
                type="number"
                min={1}
                placeholder="Prep time (minutes)"
                value={recipePrepTime}
                onChange={(e) => setRecipePrepTime(Number(e.target.value))}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">Steps</p>
                <Button variant="outline" onClick={addStepRow}>
                  Add step
                </Button>
              </div>
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      placeholder={`Step ${idx + 1}`}
                      value={step}
                      onChange={(e) => updateStep(idx, e.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={() => removeStepRow(idx)}
                      disabled={steps.length <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">Recipe ingredients</p>
                <Button variant="outline" onClick={addRecipeIngredientRow}>
                  Add ingredient row
                </Button>
              </div>

              <div className="space-y-3">
                {recipeIngredients.map((row, idx) => (
                  <div key={idx} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={row.mode === "existing" ? "default" : "outline"}
                        onClick={() =>
                          updateRecipeIngredient(idx, {
                            mode: "existing",
                            name: "",
                          })
                        }
                      >
                        Existing
                      </Button>
                      <Button
                        type="button"
                        variant={row.mode === "new" ? "default" : "outline"}
                        onClick={() =>
                          updateRecipeIngredient(idx, {
                            mode: "new",
                            ingredientId: undefined,
                          })
                        }
                      >
                        New
                      </Button>
                      <div className="ml-auto">
                        <Button
                          variant="outline"
                          onClick={() => removeRecipeIngredientRow(idx)}
                          disabled={recipeIngredients.length <= 1}
                        >
                          Remove row
                        </Button>
                      </div>
                    </div>

                    {row.mode === "existing" ? (
                      <div className="grid gap-2">
                        <select
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          value={row.ingredientId ?? ""}
                          onChange={(e) =>
                            updateRecipeIngredient(idx, {
                              ingredientId: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            })
                          }
                        >
                          <option value="">Select ingredient</option>
                          {ingredientOptions.map((ing) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <Input
                        placeholder="New ingredient name (e.g. paprika)"
                        value={row.name ?? ""}
                        onChange={(e) =>
                          updateRecipeIngredient(idx, { name: e.target.value })
                        }
                      />
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Quantity (e.g. 200)"
                        value={row.quantity ?? ""}
                        onChange={(e) =>
                          updateRecipeIngredient(idx, { quantity: e.target.value })
                        }
                      />
                      <Input
                        placeholder="Unit (e.g. g, tbsp)"
                        value={row.unit ?? ""}
                        onChange={(e) => updateRecipeIngredient(idx, { unit: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleCreateRecipe} disabled={createRecipe.isPending}>
              {createRecipe.isPending ? "Creating..." : "Create recipe"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
