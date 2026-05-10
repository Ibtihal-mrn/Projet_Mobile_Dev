import dotenv from "dotenv";

dotenv.config({
  path: "../../apps/web/.env",
});

const { default: prisma } = await import("../src/index");

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=80";

const recipeImageByTitle: Record<string, string> = {
  "Pasta al pomodoro":
    "https://images.unsplash.com/photo-1608897013039-887f21d8c804?q=80&w=992&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Tartines ricotta et miel":
    "https://images.unsplash.com/photo-1598802586325-849b09477776?q=80&w=1335&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Soupe tomate rôtie":
    "https://images.unsplash.com/photo-1620791144170-8a443bf37a33?q=80&w=1364&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Riz au lait à la vanille":
    "https://images.unsplash.com/photo-1515544645059-de313dd20a58?q=80&w=985&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Gnocchi au beurre de sauge":
    "https://images.unsplash.com/photo-1579349443343-73da56a71a20?q=80&w=1364&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Bowl quinoa avocat":
    "https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf?q=80&w=1364&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Salade de lentilles croquante":
    "https://images.unsplash.com/photo-1702650657375-934239d8b472?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Granola maison":
    "https://images.unsplash.com/photo-1517673400267-0251440c45dc?auto=format&fit=crop&w=1200&q=80",
  "Tacos de légumes rôtis":
    "https://plus.unsplash.com/premium_photo-1661730329741-b3bf77019b39?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Cheesecake yaourt citron":
    "https://images.unsplash.com/photo-1728911296471-8c57f645a44e?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Curry express de pois chiches":
    "https://plus.unsplash.com/premium_photo-1695456064603-aa7568121827?q=80&w=1364&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Poulet au citron":
    "https://images.unsplash.com/photo-1730900737724-5b752e1ed3dd?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Chili sin carne":
    "https://images.unsplash.com/photo-1658308766948-01c85ade2737?q=80&w=2342&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Omelette aux herbes":
    "https://images.unsplash.com/photo-1668283653825-37b80f055b05?q=80&w=2342&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Ramen miso rapide":
    "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80",
  "Cookies chocolat-noisette":
    "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=1200&q=80",
};

type SeedRecipe = {
  title: string;
  description: string;
  prepTime: number;
  imageUrl?: string;
  steps: string[];
  ingredients: Array<{ name: string; quantity?: string; unit?: string }>;
};

type SeedAuthor = {
  email: string;
  username: string;
};

const authors: SeedAuthor[] = [
  { email: "demo-chef-1@example.com", username: "demo_chef" },
  { email: "demo-chef-2@example.com", username: "garden_table" },
  { email: "demo-chef-3@example.com", username: "weeknight_kitchen" },
];

const recipesByAuthor: Record<string, SeedRecipe[]> = {
  "demo-chef-1@example.com": [
    {
      title: "Pasta al pomodoro",
      description: "Des pâtes simples, rapides et ultra parfumées.",
      prepTime: 25,
      ingredients: [
        { name: "pasta", quantity: "400", unit: "g" },
        { name: "tomate", quantity: "600", unit: "g" },
        { name: "ail", quantity: "2", unit: "gousses" },
        { name: "basilic", quantity: "1", unit: "poignée" },
        { name: "huile d'olive", quantity: "3", unit: "c. à soupe" },
      ],
      steps: [
        "Faire revenir l'ail dans l'huile d'olive.",
        "Ajouter les tomates et laisser compoter 15 minutes.",
        "Mélanger avec les pâtes et le basilic.",
      ],
    },
    {
      title: "Tartines ricotta et miel",
      description: "Un brunch chic et très rapide à préparer.",
      prepTime: 10,
      ingredients: [
        { name: "pain de campagne", quantity: "4", unit: "tranches" },
        { name: "ricotta", quantity: "200", unit: "g" },
        { name: "miel", quantity: "2", unit: "c. à soupe" },
        { name: "pistaches", quantity: "30", unit: "g" },
      ],
      steps: [
        "Griller légèrement le pain.",
        "Étaler la ricotta puis ajouter le miel.",
        "Parsemer de pistaches concassées.",
      ],
    },
    {
      title: "Soupe tomate rôtie",
      description: "Une soupe douce, avec un goût profond et légèrement sucré.",
      prepTime: 45,
      ingredients: [
        { name: "tomate", quantity: "1.2", unit: "kg" },
        { name: "oignon", quantity: "1", unit: "pièce" },
        { name: "ail", quantity: "3", unit: "gousses" },
        { name: "bouillon de légumes", quantity: "800", unit: "ml" },
      ],
      steps: [
        "Rôtir les tomates, l'oignon et l'ail au four.",
        "Mixer avec le bouillon chaud.",
        "Rectifier l'assaisonnement avant de servir.",
      ],
    },
    {
      title: "Riz au lait à la vanille",
      description: "Un dessert crémeux et réconfortant, parfait froid ou tiède.",
      prepTime: 50,
      ingredients: [
        { name: "riz rond", quantity: "180", unit: "g" },
        { name: "lait", quantity: "1", unit: "l" },
        { name: "sucre", quantity: "90", unit: "g" },
        { name: "vanille", quantity: "1", unit: "gousse" },
      ],
      steps: [
        "Chauffer le lait avec la vanille.",
        "Ajouter le riz et cuire doucement en remuant.",
        "Sucrer puis laisser refroidir légèrement.",
      ],
    },
    {
      title: "Gnocchi au beurre de sauge",
      description: "Un plat express avec une sauce parfumée et dorée.",
      prepTime: 20,
      ingredients: [
        { name: "gnocchi", quantity: "500", unit: "g" },
        { name: "beurre", quantity: "40", unit: "g" },
        { name: "sauge", quantity: "8", unit: "feuilles" },
        { name: "parmesan", quantity: "50", unit: "g" },
      ],
      steps: [
        "Cuire les gnocchi jusqu'à ce qu'ils remontent.",
        "Faire mousser le beurre avec la sauge.",
        "Mélanger et terminer avec le parmesan.",
      ],
    },
  ],
  "demo-chef-2@example.com": [
    {
      title: "Bowl quinoa avocat",
      description: "Un bol frais, nourrissant et coloré.",
      prepTime: 20,
      ingredients: [
        { name: "quinoa", quantity: "200", unit: "g" },
        { name: "avocat", quantity: "1", unit: "pièce" },
        { name: "concombre", quantity: "1", unit: "pièce" },
        { name: "pois chiches", quantity: "200", unit: "g" },
      ],
      steps: [
        "Cuire le quinoa et le laisser refroidir.",
        "Ajouter l'avocat, le concombre et les pois chiches.",
        "Assaisonner avec une vinaigrette citronnée.",
      ],
    },
    {
      title: "Salade de lentilles croquante",
      description: "Parfaite pour un déjeuner rapide et rassasiant.",
      prepTime: 30,
      ingredients: [
        { name: "lentilles vertes", quantity: "250", unit: "g" },
        { name: "carotte", quantity: "2", unit: "pièces" },
        { name: "échalote", quantity: "1", unit: "pièce" },
        { name: "persil", quantity: "1", unit: "poignée" },
      ],
      steps: [
        "Cuire les lentilles jusqu'à tendreté.",
        "Ajouter les légumes coupés finement.",
        "Mélanger avec une vinaigrette moutarde-citron.",
      ],
    },
    {
      title: "Granola maison",
      description: "Un petit-déjeuner croustillant à garder en bocal.",
      prepTime: 35,
      ingredients: [
        { name: "flocons d'avoine", quantity: "300", unit: "g" },
        { name: "amandes", quantity: "100", unit: "g" },
        { name: "sirop d'érable", quantity: "80", unit: "ml" },
        { name: "huile de coco", quantity: "3", unit: "c. à soupe" },
      ],
      steps: [
        "Mélanger tous les ingrédients.",
        "Étaler sur une plaque et cuire jusqu'à doré.",
        "Laisser refroidir avant de conserver.",
      ],
    },
    {
      title: "Tacos de légumes rôtis",
      description: "Des tacos colorés, simples et parfaits pour partager.",
      prepTime: 30,
      ingredients: [
        { name: "tortillas", quantity: "8", unit: "pièces" },
        { name: "courgette", quantity: "1", unit: "pièce" },
        { name: "poivron", quantity: "2", unit: "pièces" },
        { name: "haricots noirs", quantity: "250", unit: "g" },
      ],
      steps: [
        "Rôtir les légumes avec les épices.",
        "Réchauffer les tortillas.",
        "Garnir avec les légumes et les haricots noirs.",
      ],
    },
    {
      title: "Cheesecake yaourt citron",
      description: "Un dessert frais et léger, sans cuisson lourde.",
      prepTime: 35,
      ingredients: [
        { name: "yaourt grec", quantity: "400", unit: "g" },
        { name: "citron", quantity: "2", unit: "pièces" },
        { name: "biscuit", quantity: "180", unit: "g" },
        { name: "beurre", quantity: "70", unit: "g" },
      ],
      steps: [
        "Préparer la base biscuit-beurre.",
        "Mélanger le yaourt avec le citron.",
        "Assembler puis réserver au frais.",
      ],
    },
  ],
  "demo-chef-3@example.com": [
    {
      title: "Curry express de pois chiches",
      description: "Un dîner rapide, épicé et généreux.",
      prepTime: 25,
      ingredients: [
        { name: "pois chiches", quantity: "400", unit: "g" },
        { name: "lait de coco", quantity: "400", unit: "ml" },
        { name: "pâte de curry", quantity: "2", unit: "c. à soupe" },
        { name: "épinards", quantity: "150", unit: "g" },
      ],
      steps: [
        "Faire revenir la pâte de curry.",
        "Ajouter les pois chiches et le lait de coco.",
        "Terminer avec les épinards juste tombés.",
      ],
    },
    {
      title: "Poulet au citron",
      description: "Un plat simple avec une sauce brillante et acidulée.",
      prepTime: 40,
      ingredients: [
        { name: "blanc de poulet", quantity: "4", unit: "pièces" },
        { name: "citron", quantity: "2", unit: "pièces" },
        { name: "beurre", quantity: "30", unit: "g" },
        { name: "thym", quantity: "2", unit: "branches" },
      ],
      steps: [
        "Saisir le poulet jusqu'à coloration.",
        "Déglacer avec le citron et ajouter le beurre.",
        "Laisser réduire avec le thym avant de servir.",
      ],
    },
    {
      title: "Chili sin carne",
      description: "Une version végétale riche et très réconfortante.",
      prepTime: 50,
      ingredients: [
        { name: "haricots rouges", quantity: "400", unit: "g" },
        { name: "maïs", quantity: "200", unit: "g" },
        { name: "tomate concassée", quantity: "400", unit: "g" },
        { name: "cumin", quantity: "1", unit: "c. à café" },
      ],
      steps: [
        "Faire revenir les épices avec l'oignon.",
        "Ajouter les tomates, les haricots et le maïs.",
        "Laisser mijoter jusqu'à texture épaisse.",
      ],
    },
    {
      title: "Omelette aux herbes",
      description: "L'option la plus rapide quand il faut dîner vite.",
      prepTime: 12,
      ingredients: [
        { name: "œufs", quantity: "4", unit: "pièces" },
        { name: "persil", quantity: "1", unit: "poignée" },
        { name: "ciboulette", quantity: "1", unit: "poignée" },
        { name: "fromage râpé", quantity: "40", unit: "g" },
      ],
      steps: [
        "Battre les œufs avec les herbes.",
        "Cuire doucement à la poêle.",
        "Ajouter le fromage juste avant de plier l'omelette.",
      ],
    },
    {
      title: "Ramen miso rapide",
      description: "Un bol chaud, salé et réconfortant en semaine.",
      prepTime: 30,
      ingredients: [
        { name: "nouilles ramen", quantity: "200", unit: "g" },
        { name: "pâte miso", quantity: "2", unit: "c. à soupe" },
        { name: "champignons", quantity: "200", unit: "g" },
        { name: "œuf", quantity: "2", unit: "pièces" },
      ],
      steps: [
        "Préparer le bouillon au miso.",
        "Ajouter les nouilles et les champignons.",
        "Servir avec les œufs mollets.",
      ],
    },
    {
      title: "Cookies chocolat-noisette",
      description: "Des cookies moelleux avec un coeur légèrement fondant.",
      prepTime: 28,
      ingredients: [
        { name: "farine", quantity: "220", unit: "g" },
        { name: "chocolat noir", quantity: "120", unit: "g" },
        { name: "noisettes", quantity: "80", unit: "g" },
        { name: "beurre", quantity: "100", unit: "g" },
      ],
      steps: [
        "Mélanger la pâte avec le chocolat et les noisettes.",
        "Former des boules sur une plaque.",
        "Cuire juste assez pour garder le centre moelleux.",
      ],
    },
  ],
};

async function resetSeedData(authorEmails: string[]) {
  const seedAuthors = await prisma.appUser.findMany({
    where: { email: { in: authorEmails } },
    select: { id: true },
  });

  const authorIds = seedAuthors.map((author) => author.id);
  if (authorIds.length === 0) {
    return;
  }

  await prisma.collectionRecipe.deleteMany({
    where: {
      recipe: {
        authorId: { in: authorIds },
      },
    },
  });
  await prisma.recipeIngredient.deleteMany({
    where: {
      recipe: {
        authorId: { in: authorIds },
      },
    },
  });
  await prisma.recipeStep.deleteMany({
    where: {
      recipe: {
        authorId: { in: authorIds },
      },
    },
  });
  await prisma.favoriteRecipe.deleteMany({
    where: {
      recipe: {
        authorId: { in: authorIds },
      },
    },
  });
  await prisma.recipe.deleteMany({
    where: { authorId: { in: authorIds } },
  });
  await prisma.collection.deleteMany({
    where: { userId: { in: authorIds } },
  });
  await prisma.follow.deleteMany({
    where: {
      OR: [{ followerId: { in: authorIds } }, { followingId: { in: authorIds } }],
    },
  });
}

async function ensureAuthors() {
  for (const author of authors) {
    await prisma.appUser.upsert({
      where: { email: author.email },
      create: {
        email: author.email,
        username: author.username,
        passwordHash: "managed-by-better-auth",
      },
      update: {
        username: author.username,
      },
    });
  }
}

async function seedRecipe(authorEmail: string, recipe: SeedRecipe) {
  const author = await prisma.appUser.findUnique({
    where: { email: authorEmail },
    select: { id: true },
  });

  if (!author) {
    throw new Error(`Author not found for ${authorEmail}`);
  }

  const ingredientNames = recipe.ingredients.map((ingredient) => ingredient.name.toLowerCase());

  const createdIngredients = await Promise.all(
    ingredientNames.map((name) =>
      prisma.ingredient.upsert({
        where: { name },
        create: { name },
        update: {},
      }),
    ),
  );

  return prisma.recipe.create({
    data: {
      title: recipe.title,
      description: recipe.description,
      imageUrl: recipe.imageUrl ?? recipeImageByTitle[recipe.title] ?? DEFAULT_IMAGE,
      isPublic: true,
      prepTime: recipe.prepTime,
      authorId: author.id,
      steps: {
        create: recipe.steps.map((content, index) => ({
          content,
          stepOrder: index + 1,
        })),
      },
      ingredients: {
        create: recipe.ingredients.map((ingredient, index) => ({
          ingredient: {
            connect: {
              id: createdIngredients[index]!.id,
            },
          },
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        })),
      },
    },
  });
}

async function main() {
  await resetSeedData(authors.map((author) => author.email));
  await ensureAuthors();

  for (const [authorEmail, recipes] of Object.entries(recipesByAuthor)) {
    for (const recipe of recipes) {
      await seedRecipe(authorEmail, recipe);
    }
  }

  console.log(`Seeded ${Object.values(recipesByAuthor).flat().length} public recipes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });