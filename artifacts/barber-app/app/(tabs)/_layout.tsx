import { useColorScheme } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react-native";
import { useAuth } from "@/contexts/auth-context";

/**
 * Área autenticada, com a barra inferior.
 *
 * Espelha a navegação do CRM web (`components/layout/app-layout.tsx`), que já
 * era mobile-first: as mesmas 4 seções principais aparecem na barra e o resto
 * (Cupons, Relatórios, Insights, Configurações) fica para um "Mais" ainda a
 * portar.
 */
export default function TabsLayout() {
  const { user, loading } = useAuth();
  const scheme = useColorScheme();
  const dark = scheme === "dark";

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#F59E0B" />
      </View>
    );
  }

  // Guarda de rota: nenhuma tela autenticada monta sem sessão, então nenhuma
  // consulta parte com token ausente e recebe 401.
  if (!user) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#F59E0B",
        tabBarInactiveTintColor: dark ? "#8A94A6" : "#64748B",
        tabBarStyle: {
          backgroundColor: dark ? "#0D1220" : "#FFFFFF",
          borderTopColor: dark ? "#1C2333" : "#E2E8F0",
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Clientes",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: "Atendimentos",
          tabBarIcon: ({ color, size }) => (
            <CalendarDays color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: "Campanhas",
          tabBarIcon: ({ color, size }) => (
            <MessageSquare color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "Mais",
          tabBarIcon: ({ color, size }) => (
            <MoreHorizontal color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
