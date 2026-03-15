import { Button, Spinner, Surface } from "heroui-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";

export default function AuthScreen() {
  const { data: session, isPending } = authClient.useSession();
  const [showSignIn, setShowSignIn] = useState(false);

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
    return (
      <Container className="p-6">
        <View className="gap-4 pb-8">
          <Text className="text-3xl font-semibold text-foreground">Mon compte</Text>
          <Text className="text-sm text-muted-foreground">
            Tu es connecté(e) et peux créer tes recettes depuis l'application mobile.
          </Text>

          <Surface variant="secondary" className="gap-2 rounded-lg p-4">
            <Text className="text-lg font-semibold text-foreground">{session.user.name}</Text>
            <Text className="text-sm text-foreground">{session.user.email}</Text>
          </Surface>

          <Button
            onPress={() => {
              authClient.signOut();
            }}
            className="self-start"
          >
            <Button.Label>Se déconnecter</Button.Label>
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