import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  CalendarDays,
  Banknote,
  Ticket,
  Activity,
  LogOut,
} from "lucide-react-native";
import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { StatCard, Card } from "@/components/ui";

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  // The generated React Query hook from the OpenAPI spec — reused verbatim from
  // the web build. It needs no native-specific variant: the shared customFetch
  // prepends the base URL and attaches the Bearer token.
  const { data: stats, isLoading, isError, error, refetch, isRefetching } =
    useGetDashboardStats();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <View>
          <Text className="text-lg font-bold text-foreground">Dashboard</Text>
          {user ? (
            <Text className="text-xs text-muted-foreground">
              Olá, {user.nome}
            </Text>
          ) : null}
        </View>

        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Sair"
          className="h-10 w-10 items-center justify-center rounded-lg active:opacity-70"
        >
          <LogOut size={20} color="#8A94A6" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerClassName="p-4 gap-3"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#F59E0B"
          />
        }
      >
        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#F59E0B" />
          </View>
        ) : isError ? (
          <Card>
            <Text className="text-sm font-medium text-destructive">
              Não foi possível carregar as métricas.
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Erro desconhecido."}
            </Text>
            <Text className="mt-2 text-xs text-muted-foreground">
              Arraste para baixo para tentar novamente.
            </Text>
          </Card>
        ) : stats ? (
          <>
            <View className="flex-row gap-3">
              <StatCard
                title="Clientes Ativos"
                value={stats.clientesAtivos}
                icon={Users}
                tint="#3B82F6"
              />
              <StatCard
                title="Novos Hoje"
                value={stats.clientesNovosHoje}
                icon={TrendingUp}
                tint="#22C55E"
              />
            </View>

            <View className="flex-row gap-3">
              <StatCard
                title="Aguard. Retorno"
                value={stats.clientesAguardandoRetorno}
                icon={Clock}
                tint="#EAB308"
              />
              <StatCard
                title="Em Risco"
                value={stats.clientesEmRisco}
                icon={AlertCircle}
                tint="#EF4444"
              />
            </View>

            <View className="flex-row gap-3">
              <StatCard
                title="Atend. Hoje"
                value={stats.atendimentosHoje}
                icon={CalendarDays}
                tint="#A855F7"
              />
              <StatCard
                title="Faturamento"
                value={`R$ ${stats.faturamentoHoje.toFixed(2)}`}
                icon={Banknote}
                tint="#10B981"
              />
            </View>

            <View className="flex-row gap-3">
              <StatCard
                title="Cupons Usados"
                value={stats.cuponsUtilizados}
                icon={Ticket}
                tint="#F97316"
              />
              <StatCard
                title="Taxa Retorno"
                value={`${stats.taxaRetorno}%`}
                icon={Activity}
                tint="#6366F1"
              />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
