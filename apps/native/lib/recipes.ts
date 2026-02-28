export type Recipe = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  prepTime: string;
  servings: number;
  ingredients: string[];
  steps: string[];
};

export const RECIPES: Recipe[] = [
  {
    id: "omelette-fromage",
    title: "Omelette au fromage",
    description: "Rapide, moelleuse et parfaite pour un déjeuner express.",
    imageUrl:
      "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&w=1200&q=80",
    prepTime: "15 min",
    servings: 2,
    ingredients: [
      "4 oeufs",
      "60 g de fromage râpé",
      "1 c. à soupe de beurre",
      "Sel",
      "Poivre",
    ],
    steps: [
      "Battre les oeufs avec le sel et le poivre.",
      "Faire fondre le beurre dans une poêle chaude.",
      "Verser les oeufs et mélanger légèrement au centre.",
      "Ajouter le fromage puis plier l'omelette.",
      "Servir immédiatement.",
    ],
  },
  {
    id: "pates-tomate-basilic",
    title: "Pâtes tomate basilic",
    description: "Un classique simple avec une sauce parfumée.",
    imageUrl:
      "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=1200&q=80",
    prepTime: "25 min",
    servings: 3,
    ingredients: [
      "300 g de pâtes",
      "400 g de tomates concassées",
      "2 gousses d'ail",
      "1 c. à soupe d'huile d'olive",
      "Quelques feuilles de basilic",
      "Sel",
      "Poivre",
    ],
    steps: [
      "Cuire les pâtes selon les instructions du paquet.",
      "Faire revenir l'ail dans l'huile d'olive.",
      "Ajouter les tomates, saler, poivrer et mijoter 10 minutes.",
      "Mélanger les pâtes avec la sauce.",
      "Ajouter le basilic juste avant de servir.",
    ],
  },
  {
    id: "salade-quinoa-feta",
    title: "Salade quinoa feta",
    description: "Fraîche, équilibrée et idéale pour un dîner léger.",
    imageUrl:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80",
    prepTime: "20 min",
    servings: 2,
    ingredients: [
      "150 g de quinoa",
      "100 g de feta",
      "1 concombre",
      "10 tomates cerises",
      "1 c. à soupe d'huile d'olive",
      "Jus d'un demi-citron",
      "Sel",
      "Poivre",
    ],
    steps: [
      "Rincer puis cuire le quinoa, laisser refroidir.",
      "Couper le concombre, les tomates et la feta.",
      "Mélanger tous les ingrédients dans un saladier.",
      "Assaisonner avec huile d'olive, citron, sel et poivre.",
      "Servir frais.",
    ],
  },
];

export function getRecipeById(id: string) {
  return RECIPES.find((recipe) => recipe.id === id);
}
