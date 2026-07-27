import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import {
  useGetDashboardStats,
  useGetDashboardCharts,
} from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import {
  ScreenHeader,
  HeroBlock,
  Card,
  Chip,
  GroupedList,
  GroupedRow,
  SectionTitle,
  INK,
  INK_MUTED,
} from "@/components/ui";
import { BarChartCard, AreaChartCard } from "@/components/charts";
import { TrialBanner } from "@/components/subscription-gate";

const money = (value: number) =>
  `R$ ${value.toFixed(2).replace(".", ",")}`;

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Um número por vez, não oito iguais.
 *
 * A versão anterior mostrava 8 StatCards idênticos numa grade 2×4 — o layout
 * mais indistinguível que existe, e que fazia o faturamento do dia competir por
 * atenção com "cupons usados".
 *
 * Aqui o faturamento fica sozinho no bloco escuro e o resto desce para uma lista
 * agrupada, onde cada linha é um par rótulo/valor legível de relance. Ler oito
 * números virou ler uma coluna, não varrer uma grade.
 */
export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const { data: stats, isLoading, isError, error, refetch, isRefetching } =
    useGetDashboardStats();

  const { data: charts, refetch: refetchCharts } = useGetDashboardCharts();

  // Puxar para atualizar recarrega KPIs e gráficos juntos, senão os números e as
  // curvas passam a contar histórias de momentos diferentes.
  const handleRefresh = () => {
    void refetch();
    void refetchCharts();
  };

  const primeiroNome = user?.nome?.split(" ")[0] ?? "";

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <ScreenHeader
        eyebrow={greeting()}
        title={primeiroNome || "Início"}
        right={<Chip label="Hoje" />}
      />

      <TrialBanner />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 96,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={INK}
          />
        }
      >
        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color={INK} />
          </View>
        ) : isError ? (
          <Card>
            <Text className="text-base font-semibold text-ink">
              Não foi possível carregar as métricas.
            </Text>
            <Text className="mt-1 text-sm text-ink-muted">
              {error instanceof Error ? error.message : "Erro desconhecido."}
            </Text>
            <Text className="mt-3 text-sm text-ink-muted">
              Arraste para baixo para tentar novamente.
            </Text>
          </Card>
        ) : stats ? (
          <>
            {/* O número que importa no dia, sozinho e grande. */}
            <HeroBlock
              label="Faturamento de hoje"
              value={money(stats.faturamentoHoje)}
              caption={`${stats.atendimentosHoje} ${
                stats.atendimentosHoje === 1 ? "atendimento" : "atendimentos"
              } hoje`}
            >
              <View className="mt-5 flex-row items-center gap-6 border-t border-white/10 pt-4">
                <View>
                  <Text className="text-sm text-ink-inverse-muted">
                    Taxa de retorno
                  </Text>
                  <Text className="mt-0.5 text-xl font-bold text-ink-inverse">
                    {stats.taxaRetorno}%
                  </Text>
                </View>
                <View>
                  <Text className="text-sm text-ink-inverse-muted">
                    Clientes ativos
                  </Text>
                  <Text className="mt-0.5 text-xl font-bold text-ink-inverse">
                    {stats.clientesAtivos}
                  </Text>
                </View>
              </View>
            </HeroBlock>

            {/*
              Recall primeiro, e em ordem de urgência: Em Risco no topo porque é
              quem exige contato hoje. A grade anterior enterrava isso no meio de
              oito números de peso visual igual.
            */}
            <GroupedList title="Recall">
              <GroupedRow
                label="Em risco"
                value={String(stats.clientesEmRisco)}
                onPress={() => router.push("/clients")}
              />
              <GroupedRow
                label="Aguardando retorno"
                value={String(stats.clientesAguardandoRetorno)}
                onPress={() => router.push("/clients")}
              />
              <GroupedRow
                label="Novos hoje"
                value={String(stats.clientesNovosHoje)}
                last
                onPress={() => router.push("/clients")}
              />
            </GroupedList>

            <GroupedList title="Movimento">
              <GroupedRow
                label="Atendimentos hoje"
                value={String(stats.atendimentosHoje)}
                onPress={() => router.push("/appointments")}
              />
              <GroupedRow
                label="Cupons usados"
                value={String(stats.cuponsUtilizados)}
                last
                onPress={() => router.push("/more/coupons")}
              />
            </GroupedList>
          </>
        ) : null}

        {charts ? (
          <>
            <SectionTitle title="Evolução" />

            <AreaChartCard
              title="Receita"
              subtitle="Últimos 6 meses"
              points={charts.receita}
              formatValue={(value) => `R$ ${value.toFixed(0)}`}
            />

            <BarChartCard
              title="Clientes por dia"
              subtitle="Esta semana"
              points={charts.clientesPorDia}
              formatValue={(value) =>
                `${value} ${value === 1 ? "cliente" : "clientes"}`
              }
            />

            <AreaChartCard
              title="Retornos por mês"
              subtitle="Clientes que voltaram"
              points={charts.retornoMensal}
              formatValue={(value) =>
                `${value} ${value === 1 ? "retorno" : "retornos"}`
              }
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
