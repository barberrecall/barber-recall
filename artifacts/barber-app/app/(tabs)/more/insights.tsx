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
import { FormHeader } from "@/components/form";
import { Card, EmptyState } from "@/components/ui";

/** Cada tipo de insight tem peso diferente e merece leitura visual distinta. */
const TIPO_STYLE: Record<InsightTipo, { icon: LucideIcon; tint: string }> = {
  warning: { icon: AlertTriangle, tint: "#EF4444" },
  opportunity: { icon: Lightbulb, tint: "#F59E0B" },
  success: { icon: CheckCircle2, tint: "#10B981" },
  info: { icon: Info, tint: "#3B82F6" },
};

function InsightRow({ insight }: { insight: Insight }) {
  const style = TIPO_STYLE[insight.tipo] ?? TIPO_STYLE.info;
  const Icon = style.icon;

  return (
    <Card className="mb-2">
      <View className="flex-row gap-3">
        <Icon size={18} color={style.tint} />
        <View className="flex-1">
          <Text className="text-sm text-foreground">{insight.mensagem}</Text>
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
    <View className="flex-1 bg-background">
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
              Não foi possível carregar os insights.
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Erro desconhecido."}
            </Text>
          </Card>
        ) : (
          <>
            <View className="mb-3 flex-row gap-3">
              <Card className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-muted-foreground">
                    Receita a recuperar
                  </Text>
                  <TrendingUp size={16} color="#10B981" />
                </View>
                <Text className="mt-1 text-xl font-bold text-foreground">
                  R$ {data.potentialRevenue.toFixed(2).replace(".", ",")}
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  {data.clientesEmRisco} cliente(s) em risco
                </Text>
              </Card>
            </View>

            <Card className="mb-4">
              <View className="flex-row items-center gap-2">
                <CalendarClock size={16} color="#6366F1" />
                <Text className="text-xs text-muted-foreground">
                  Melhor momento para disparar
                </Text>
              </View>
              <Text className="mt-1 text-sm font-semibold text-foreground">
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
