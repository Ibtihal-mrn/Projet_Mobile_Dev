import { Button, Spinner, Surface } from "heroui-native";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/utils/orpc";

export default function AuthScreen() {
  const { data: session, isPending } = authClient.useSession();
  const [showSignIn, setShowSignIn] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    try {
      setLogoutError(null);
      setIsSigningOut(true);

      await authClient.signOut({
        fetchOptions: {
          onSuccess: async () => {
            await queryClient.invalidateQueries();
          },
        },
      });
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "La déconnexion a échoué.");
    } finally {
      setIsSigningOut(false);
    }
  }

  if (isPending) {
    return (
      <Container className="p-6">
        <View className="flex-1 items-center justify-center gap-4">
          <Spinner size="lg" color="default" />
          <Text className="text-base text-foreground">Chargement du compte...</Text>
        </View>
      </Container>
    );
  }

  if (session?.user) {
    const avatarSeed = session.user.name || session.user.email;
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarSeed)}&background=0f766e&color=ffffff&size=256&bold=true&format=png`;

    return (
      <Container className="p-6">
        <View className="gap-4 pb-8">
          <Text className="text-3xl font-semibold text-foreground">Mon compte</Text>
          <Text className="text-sm text-muted-foreground">
            Tu es connecté(e) et peux créer tes recettes depuis l'application mobile.
          </Text>

          {logoutError ? <Text className="text-sm text-danger">{logoutError}</Text> : null}

          <Surface variant="secondary" className="flex-row items-center gap-4 rounded-lg p-4">
            <Image source={{ uri: avatarUrl }} className="h-16 w-16 rounded-full bg-background" />

            <View className="flex-1 gap-1">
              <Text className="text-lg font-semibold text-foreground">{session.user.name}</Text>
              <Text className="text-sm text-foreground">{session.user.email}</Text>
            </View>
          </Surface>

          <Button onPress={handleSignOut} isDisabled={isSigningOut} className="self-start">
            {isSigningOut ? (
              <Spinner size="sm" color="default" />
            ) : (
              <Button.Label>Se déconnecter</Button.Label>
            )}
          </Button>
        </View>
      </Container>
    );
  }

  return (
    <Container className="p-6">
      <View className="gap-4 pb-8">
        <Text className="text-3xl font-semibold text-foreground">Identification</Text>
        <Text className="text-sm text-muted-foreground">
          Connecte-toi ou crée un compte pour publier et gérer tes recettes.
        </Text>

        {showSignIn ? <SignIn /> : <SignUp />}

        <View className="items-center">
          <Pressable onPress={() => setShowSignIn((previous) => !previous)}>
            <Text className="text-sm font-medium text-foreground underline">
              {showSignIn
                ? "Pas encore de compte ? Crée-en un"
                : "Déjà un compte ? Connecte-toi"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Container>
  );
}