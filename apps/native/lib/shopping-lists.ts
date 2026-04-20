import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";

const SHOPPING_LISTS_STORAGE_KEY = "shopping-lists-v1";

export type ShoppingListPdf = {
  id: string;
  recipeId: number;
  recipeTitle: string;
  servings: number;
  baseServings: number;
  createdAt: string;
  fileUri: string;
  fileName: string;
  items: string[];
};

type CreateShoppingListPdfInput = {
  recipeId: number;
  recipeTitle: string;
  servings: number;
  baseServings: number;
  items: string[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function getTimestampForFileName(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}${month}${day}-${hours}${minutes}`;
}

async function readShoppingLists() {
  const payload = await AsyncStorage.getItem(SHOPPING_LISTS_STORAGE_KEY);

  if (!payload) {
    return [] as ShoppingListPdf[];
  }

  try {
    const parsed = JSON.parse(payload) as ShoppingListPdf[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => {
      return (
        typeof item?.id === "string" &&
        typeof item?.recipeTitle === "string" &&
        typeof item?.fileUri === "string" &&
        typeof item?.createdAt === "string" &&
        Array.isArray(item?.items)
      );
    });
  } catch {
    return [];
  }
}

async function writeShoppingLists(items: ShoppingListPdf[]) {
  await AsyncStorage.setItem(SHOPPING_LISTS_STORAGE_KEY, JSON.stringify(items));
}

export async function getShoppingLists() {
  const lists = await readShoppingLists();

  return lists.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function addShoppingList(list: ShoppingListPdf) {
  const current = await readShoppingLists();
  const next = [list, ...current.filter((item) => item.id !== list.id)];
  await writeShoppingLists(next);
}

export async function removeShoppingListById(id: string) {
  const current = await readShoppingLists();
  const listToDelete = current.find((item) => item.id === id);

  if (listToDelete?.fileUri) {
    const fileInfo = await FileSystem.getInfoAsync(listToDelete.fileUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(listToDelete.fileUri, { idempotent: true });
    }
  }

  await writeShoppingLists(current.filter((item) => item.id !== id));
}

export async function createShoppingListPdf(input: CreateShoppingListPdfInput) {
  const now = new Date();
  const safeRecipeTitle =
    slugify(input.recipeTitle) || `recette-${input.recipeId}`;
  const timestamp = getTimestampForFileName(now);
  const fileName = `liste-courses-${safeRecipeTitle}-${timestamp}.pdf`;

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; color: #111827; }
          h1 { margin: 0 0 8px 0; font-size: 22px; }
          p { margin: 4px 0; font-size: 14px; color: #374151; }
          ul { margin-top: 16px; padding-left: 18px; }
          li { margin-bottom: 8px; font-size: 15px; }
        </style>
      </head>
      <body>
        <h1>Liste de courses</h1>
        <p><strong>Recette:</strong> ${escapeHtml(input.recipeTitle)}</p>
        <p><strong>Portions:</strong> ${input.servings} (base: ${input.baseServings})</p>
        <p><strong>Date:</strong> ${escapeHtml(now.toLocaleString("fr-FR"))}</p>
        <ul>
          ${input.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </body>
    </html>
  `;

  const pdfFile = await Print.printToFileAsync({ html, base64: false });

  if (!FileSystem.documentDirectory) {
    throw new Error("Impossible d'acceder au stockage local de l'appareil.");
  }

  const destinationUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.copyAsync({
    from: pdfFile.uri,
    to: destinationUri,
  });

  return {
    id: `${input.recipeId}-${now.getTime()}`,
    recipeId: input.recipeId,
    recipeTitle: input.recipeTitle,
    servings: input.servings,
    baseServings: input.baseServings,
    createdAt: now.toISOString(),
    fileUri: destinationUri,
    fileName,
    items: input.items,
  } satisfies ShoppingListPdf;
}
