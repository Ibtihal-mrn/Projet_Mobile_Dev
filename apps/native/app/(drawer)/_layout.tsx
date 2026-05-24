import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useThemeColor } from "heroui-native";
import React, { useCallback } from "react";
import { Pressable, Text } from "react-native";

import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";

function DrawerLayout() {
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const renderThemeToggle = useCallback(() => <ThemeToggle />, []);

  return (
    <Drawer
      screenOptions={{
        headerTintColor: themeColorForeground,
        headerStyle: { backgroundColor: themeColorBackground },
        headerTitleStyle: {
          fontWeight: "600",
          color: themeColorForeground,
        },
        headerRight: renderThemeToggle,
        drawerStyle: { backgroundColor: themeColorBackground },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          headerTitle: "Home",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Home</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerTitle: "Mon espace",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Mon espace</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <MaterialIcons
              name="space-dashboard"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable className="mr-4">
                <Ionicons name="add-outline" size={24} color={themeColorForeground} />
              </Pressable>
            </Link>
          ),
        }}
      />
      <Drawer.Screen
        name="search"
        options={{
          headerTitle: "Recherche recettes",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>Recherche</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="search-outline"
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="auth"
        options={{
          headerTitle: session?.user ? "Mon compte" : "Connexion",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : themeColorForeground }}>
              {session?.user ? "Mon compte" : "Connexion"}
            </Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name={session?.user ? "person-circle-outline" : "log-in-outline"}
              size={size}
              color={focused ? color : themeColorForeground}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="recipes/[id]"
        options={{
          headerTitle: "Recette",
          drawerItemStyle: {
            display: "none",
          },
          headerLeft: ({ tintColor }) => (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(drawer)"))}
              className="ml-4"
            >
              <Ionicons name="arrow-back" size={22} color={tintColor ?? themeColorForeground} />
            </Pressable>
          ),
        }}
      />
      <Drawer.Screen
        name="recipes/new"
        options={{
          headerTitle: "Nouvelle recette",
          drawerItemStyle: {
            display: "none",
          },
          headerLeft: ({ tintColor }) => (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(drawer)"))}
              className="ml-4"
            >
              <Ionicons name="arrow-back" size={22} color={tintColor ?? themeColorForeground} />
            </Pressable>
          ),
        }}
      />
      <Drawer.Screen
        name="collections/[id]"
        options={{
          headerTitle: "Collection",
          drawerItemStyle: {
            display: "none",
          },
          headerLeft: ({ tintColor }) => (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(drawer)/(tabs)/collections"))}
              className="ml-4"
            >
              <Ionicons name="arrow-back" size={22} color={tintColor ?? themeColorForeground} />
            </Pressable>
          ),
        }}
      />
      <Drawer.Screen
        name="users/[id]"
        options={{
          headerTitle: "Profil",
          drawerItemStyle: {
            display: "none",
          },
          headerLeft: ({ tintColor }) => (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(drawer)/(tabs)/amis"))}
              className="ml-4"
            >
              <Ionicons name="arrow-back" size={22} color={tintColor ?? themeColorForeground} />
            </Pressable>
          ),
        }}
      />
      <Drawer.Screen
        name="recipes/edit/[id]"
        options={{
          headerTitle: "Modifier la recette",
          drawerItemStyle: {
            display: "none",
          },
          headerLeft: ({ tintColor }) => (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(drawer)"))}
              className="ml-4"
            >
              <Ionicons name="arrow-back" size={22} color={tintColor ?? themeColorForeground} />
            </Pressable>
          ),
        }}
      />
    </Drawer>
  );
}

export default DrawerLayout;
