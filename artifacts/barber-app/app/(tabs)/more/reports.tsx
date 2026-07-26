import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Banknote,
  TrendingUp,
  Users,
  Repeat,
  Clock,
  Receipt,
  Ticket,
  Send,
  MailOpen,
  Activity,
} from "lucide-react-native";
import {
  useGetReportsOverview,
  type GetReportsOverviewPeriod,
} from "@workspace/api-client-react";
import { FormHeader, ChipOption } from "@/components/form";
import { Card, StatCard } from "@/components/ui";

const PERIODS: { value: GetReportsOverviewPeriod; label: string }[] = [
  { value: "day", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

const money = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<GetReportsOverviewPeriod>("month");

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useGetReportsOverview({ period });

  return (
    <View className="flex-1 bg-background">
      <FormHeader title="Relatórios" />

      <View className="flex-row gap-2 border-b border-border px-4 pb-3">
        {PERIODS.map((option) => (
          <ChipOption
            key={option.value}
            label={option.label}
            selected={period === option.value}
            onPress={() => setPeriod(option.value)}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
          gap: 12,
        }}
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
        ) : isError || !data ? (
          <Card>
            <Text className="text-sm text-destructive">
              Não foi possível carregar os relatórios.
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Erro desconhecido."}
            </Text>
          </Card>
        ) : (
          <>
            <View className="flex-row gap-3">
              <StatCard
                title="Receita diária"
                value={money(data.receitaDiaria)}
                icon={Banknote}
                tint="#10B981"
              />
              <StatCard
                title="Receita mensal"
                value={money(data.receitaMensal)}
                icon={TrendingUp}
                tint="#22C55E"
              />
            </View>

            <View className="flex-row gap-3">
              <StatCard
                title="Clientes novos"
                value={data.clientesNovos}
                icon={Users}
                tint="#3B82F6"
              />
              <StatCard
                title="Recorrentes"
                value={data.clientesRecorrentes}
                icon={Repeat}
                tint="#8B5CF6"
              />
            </View>

            <View className="flex-row gap-3">
              <StatCard
                title="Retorno médio"
                value={`${data.tempoMedioRetorno}d`}
                icon={Clock}
                tint="#EAB308"
              />
              <StatCard
                title="Ticket médio"
                value={money(data.ticketMedio)}
                icon={Receipt}
                tint="#F59E0B"
              />
            </View>

            <View className="flex-row gap-3">
              <StatCard
                title="Cupons usados"
                value={data.cuponsUsados}
                icon={Ticket}
                tint="#F97316"
              />
              <StatCard
                title="Camp. enviadas"
                value={data.campanhasEnviadas}
                icon={Send}
                tint="#06B6D4"
              />
            </View>

            <View className="flex-row gap-3">
              <StatCard
                title="Taxa de abertura"
                value={`${data.taxaAbertura}%`}
                icon={MailOpen}
                tint="#EC4899"
              />
              <StatCard
                title="Taxa de retorno"
                value={`${data.taxaRetorno}%`}
                icon={Activity}
                tint="#6366F1"
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
