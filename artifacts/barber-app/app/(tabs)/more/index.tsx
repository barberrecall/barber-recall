import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import {
  Ticket,
  BarChart3,
  Lightbulb,
  Settings,
  LogOut,
  ChevronRight,
  type LucideIcon,
} from "lucide-react-native";
import { useAuth } from "@/contexts/auth-context";
import { Card } from "@/components/ui";

/** Mesmas seções que o CRM web esconde atrás do "Mais" na barra inferior. */
const ITEMS: { href: Href; label: string; description: string; icon: LucideIcon; tint: string }[] = [
  {
    href: "/more/coupons",
    label: "Cupons",
    description: "Descontos e códigos promocionais",
    icon: Ticket,
    tint: "#F97316",
  },
  {
    href: "/more/reports",
    label: "Relatórios",
    description: "Receita, ticket médio e retorno",
    icon: BarChart3,
    tint: "#6366F1",
  },
  {
    href: "/more/insights",
    label: "Insights",
    description: "Oportunidades e clientes em risco",
    icon: Lightbulb,
    tint: "#EAB308",
  },
  {
    href: "/more/settings",
    label: "Configurações",
    description: "Dados da barbearia e janela de retorno",
    icon: Settings,
    tint: "#8A94A6",
  },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert("Sair", "Deseja encerrar a sessão?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="border-b border-border px-4 pb-3 pt-2">
        <Text className="text-lg font-bold text-foreground">Mais</Text>
        {user ? (
          <Text className="text-xs text-muted-foreground">{user.email}</Text>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
          gap: 8,
        }}
      >
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={String(item.href)}
              onPress={() => router.push(item.href)}
              accessibilityRole="button"
              className="active:opacity-70"
            >
              <Card>
                <View className="flex-row items-center gap-3">
                  <View
                    className="h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${item.tint}1A` }}
                  >
                    <Icon size={18} color={item.tint} />
                  </View>

                  <View className="flex-1">
                    <Text className="text-base font-semibold text-foreground">
                      {item.label}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {item.description}
                    </Text>
                  </View>

                  <ChevronRight size={16} color="#8A94A6" />
                </View>
              </Card>
            </Pressable>
          );
        })}

        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          className="mt-4 active:opacity-70"
        >
          <Card>
            <View className="flex-row items-center gap-3">
              <View
                className="h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: "#EF44441A" }}
              >
                <LogOut size={18} color="#EF4444" />
              </View>
              <Text className="text-base font-semibold" style={{ color: "#EF4444" }}>
                Sair da conta
              </Text>
            </View>
          </Card>
        </Pressable>
      </ScrollView>
    </View>
  );
}
