import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, Chip, useThemeColor } from "heroui-native";
import { Text, View, Pressable } from "react-native";

import { Container } from "@/components/container";
import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";
import { queryClient, orpc } from "@/utils/orpc";

export default function Home() {
  const healthCheck = useQuery(orpc.healthCheck.queryOptions());
  const privateData = useQuery(orpc.privateData.queryOptions());
  const isConnected = healthCheck?.data === "OK";
  const isLoading = healthCheck?.isLoading;
  const { data: session } = authClient.useSession();

  const mutedColor = useThemeColor("muted");
  const successColor = useThemeColor("success");
  const dangerColor = useThemeColor("danger");
  const foregroundColor = useThemeColor("foreground");

  const ingredients = useQuery(orpc.ingredients.list.queryOptions())

  const addIngredient = useMutation(orpc.ingredients.create.mutationOptions())

  return (
    <Container className="p-6">
      <View className="py-4 mb-6">
        <Text className="text-4xl font-bold text-foreground mb-2">BETTER T STACK</Text>
      </View>
      <Text>{JSON.stringify(ingredients.data)}</Text>
    </Container>
  );
}
