import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Info,
  TrendingUp,
  CalendarClock,
  type LucideIcon,
} from "lucide-react-native";
import {
  useGetInsights,
  type Insight,
  type InsightTipo,
} from "@workspace/api-client-react";
import { FormHeader,
  INK_MUTED,
  INK,
} from "@/components/form";
import { Card, EmptyState } from "@/components/ui";

/** Cada tipo de insight tem peso diferente e merece leitura visual distinta. */
const TIPO_STYLE: Record<InsightTipo, { icon: LucideIcon; tint: string }> = {
  warning: { icon: AlertTriangle, tint: INK_MUTED },
  opportunity: { icon: Lightbulb, tint: INK },
  success: { icon: CheckCircle2, tint: INK_MUTED },
  info: { icon: Info, tint: INK_MUTED },
};

function InsightRow({ insight }: { insight: Insight }) {
  const style = TIPO_STYLE[insight.tipo] ?? TIPO_STYLE.info;
  const Icon = style.icon;

  return (
    <Card className="mb-2">
      <View className="flex-row gap-3">
        <Icon size={18} color={style.tint} />
        <View className="flex-1">
          <Text className="text-sm text-ink">{insight.mensagem}</Text>
          {insight.impacto != null ? (
            <Text className="mt-1 text-xs font-semibold" style={{ color: style.tint }}>
              Impacto estimado: R$ {insight.impacto.toFixed(2).replace(".", ",")}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch, isRefetching } = useGetInsights();

  return (
    <View className="flex-1 bg-canvas">
      <FormHeader title="Insights" />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={INK}
          />
        }
      >
        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color={INK} />
          </View>
        ) : isError || !data ? (
          <Card>
            <Text className="text-sm text-ink">
              Não foi possível carregar os insights.
            </Text>
            <Text className="mt-1 text-xs text-ink-muted">
              {error instanceof Error ? error.message : "Erro desconhecido."}
            </Text>
          </Card>
        ) : (
          <>
            <View className="mb-3 flex-row gap-3">
              <Card className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-ink-muted">
                    Receita a recuperar
                  </Text>
                  <TrendingUp size={16} color={INK} />
                </View>
                <Text className="mt-1 text-xl font-bold text-ink">
                  R$ {data.potentialRevenue.toFixed(2).replace(".", ",")}
                </Text>
                <Text className="mt-0.5 text-xs text-ink-muted">
                  {data.clientesEmRisco} cliente(s) em risco
                </Text>
              </Card>
            </View>

            <Card className="mb-4">
              <View className="flex-row items-center gap-2">
                <CalendarClock size={16} color={INK_MUTED} />
                <Text className="text-xs text-ink-muted">
                  Melhor momento para disparar
                </Text>
              </View>
              <Text className="mt-1 text-sm font-semibold text-ink">
                {data.melhorDiaCampanha} · {data.melhorHorario}
              </Text>
            </Card>

            {data.insights.length > 0 ? (
              data.insights.map((insight) => (
                <InsightRow key={insight.id} insight={insight} />
              ))
            ) : (
              <EmptyState
                icon={Lightbulb}
                title="Nada a sinalizar"
                description="Sem oportunidades ou alertas no momento."
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
