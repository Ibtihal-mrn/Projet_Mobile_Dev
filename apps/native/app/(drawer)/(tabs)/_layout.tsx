import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";

export default function TabLayout() {
  const themeColorForeground = useThemeColor("foreground");
  const themeColorBackground = useThemeColor("background");

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: themeColorBackground,
        },
        headerTintColor: themeColorForeground,
        headerTitleStyle: {
          color: themeColorForeground,
          fontWeight: "600",
        },
        tabBarStyle: {
          backgroundColor: themeColorBackground,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Mes recettes",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons
                          name="book-outline"
                          size={size}
                          color={color}
                        />

          ),
        }}
      />
      <Tabs.Screen
        name="amis"
        options={{
          title: "Amis",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: "Collections",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="liste-de-courses"
        options={{
          title: "Liste de courses",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="basket-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    
  );
}
