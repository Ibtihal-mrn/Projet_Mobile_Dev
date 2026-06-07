import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useFocusEffect } from "expo-router";
import { Button, Spinner } from "heroui-native";
import { useCallback, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import {
  type ShoppingListPdf,
  getShoppingLists,
  removeShoppingListById,
} from "@/lib/shopping-lists";
import Ionicons from "@expo/vector-icons/build/Ionicons";

function formatDate(dateIsoString: string) {
  return new Date(dateIsoString).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ShoppingListScreen() {
  const [lists, setLists] = useState<ShoppingListPdf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeListId, setActiveListId] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await getShoppingLists();
      setLists(data);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les listes de courses.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLists();
    }, [loadLists]),
  );

  const handleDownload = useCallback(async (list: ShoppingListPdf) => {
    setActiveListId(list.id);

    try {
      const fileInfo = await FileSystem.getInfoAsync(list.fileUri);

      if (!fileInfo.exists) {
        Alert.alert(
          "Fichier introuvable",
          "Le PDF n'existe plus sur cet appareil.",
        );
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          "Téléchargement indisponible",
          "Le partage de fichiers n'est pas disponible sur cet appareil.",
        );
        return;
      }

      await Sharing.shareAsync(list.fileUri, {
        mimeType: "application/pdf",
        dialogTitle: "Télécharger la liste de courses",
        UTI: "com.adobe.pdf",
      });
    } catch (downloadError) {
      Alert.alert(
        "Erreur",
        downloadError instanceof Error
          ? downloadError.message
          : "Impossible de télécharger ce PDF.",
      );
    } finally {
      setActiveListId(null);
    }
  }, []);

  const handleDelete = useCallback(
    async (list: ShoppingListPdf) => {
      setActiveListId(list.id);

      try {
        await removeShoppingListById(list.id);
        await loadLists();
      } catch (deleteError) {
        Alert.alert(
          "Erreur",
          deleteError instanceof Error
            ? deleteError.message
            : "Impossible de supprimer cette liste.",
        );
      } finally {
        setActiveListId(null);
      }
    },
    [loadLists],
  );

  return (
    <Container className="p-6">
      <View className="gap-4 pb-8">
        <Text className="text-3xl font-semibold text-foreground">
          Liste de courses
        </Text>
        <Text className="text-sm text-muted-foreground">
          Les PDFs générés depuis tes recettes sont enregistrés ici.
        </Text>

        <Button
          className="self-start"
          variant="outline"
          onPress={() => void loadLists()}
          isDisabled={isLoading}
        >
          <Button.Label>Actualiser</Button.Label>
        </Button>

        {isLoading ? (
          <View className="items-center py-6">
            <Spinner size="lg" color="default" />
          </View>
        ) : null}

        {error ? <Text className="text-sm text-danger">{error}</Text> : null}

        {!isLoading && !error && lists.length === 0 ? (
          <Text className="text-sm text-muted-foreground">
            Aucune liste enregistrée pour le moment. Ouvre une recette et appuie
            sur "Générer la liste".
          </Text>
        ) : null}

        {lists.map((list) => {
          const isActive = activeListId === list.id;

          return (
            <View key={list.id} className="gap-2 rounded-xl bg-secondary p-4">
              {/* Titre + actions alignés sur une seule ligne */}
              <View className="flex-row items-center gap-2">
                <Text
                  className="flex-1 text-base font-semibold text-foreground"
                  numberOfLines={1}
                >
                  {list.recipeTitle}
                </Text>

                <Button
                  size="sm"
                  variant="primary"
                  onPress={() => void handleDownload(list)}
                  isDisabled={isActive}
                >
                  {isActive ? (
                    <Spinner size="sm" color="default" />
                  ) : (
                    <Button.Label>Télécharger</Button.Label>
                  )}
                </Button>

                <Pressable
                  hitSlop={8}
                  disabled={isActive}
                  onPress={() => {
                    Alert.alert(
                      "Supprimer cette liste",
                      "Voulez-vous supprimer ce PDF de la liste ?",
                      [
                        { text: "Annuler", style: "cancel" },
                        {
                          text: "Supprimer",
                          style: "destructive",
                          onPress: () => void handleDelete(list),
                        },
                      ],
                    );
                  }}
                >
                  <Ionicons name="close-circle" size={28} color="#ef4444" />
                </Pressable>
              </View>

              <Text className="text-sm text-muted-foreground">
                {formatDate(list.createdAt)} • {list.servings} portion
                {list.servings > 1 ? "s" : ""}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {list.fileName}
              </Text>
            </View>
          );
        })}
      </View>
    </Container>
  );
}
