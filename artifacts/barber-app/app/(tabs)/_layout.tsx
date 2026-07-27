import { Redirect, Tabs } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/contexts/auth-context";
import { FloatingTabBar } from "@/components/floating-tab-bar";
import { SubscriptionGate } from "@/components/subscription-gate";
import { INK } from "@/components/ui";

/**
 * Área autenticada.
 *
 * A barra padrão é substituída pela flutuante (ver components/floating-tab-bar),
 * então `tabBar` recebe o componente próprio e o restante das opções de estilo
 * de aba deixa de ser usado.
 */
export default function TabsLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator size="large" color={INK} />
      </View>
    );
  }

  // Guarda de rota: nenhuma tela autenticada monta sem sessão, então nenhuma
  // consulta parte com token ausente e recebe 401.
  if (!user) return <Redirect href="/login" />;

  // O bloqueio envolve as abas inteiras, não cada tela: caso contrário o
  // barbeiro navegaria por telas vazias em vez de entender que o acesso expirou.
  return (
    <SubscriptionGate>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: "#F1F2F4" },
        }}
      >
        <Tabs.Screen name="dashboard" />
        <Tabs.Screen name="clients" />
        <Tabs.Screen name="appointments" />
        <Tabs.Screen name="campaigns" />
        <Tabs.Screen name="more" />
      </Tabs>
    </SubscriptionGate>
  );
}
