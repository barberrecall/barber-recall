import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  useGetReportsOverview,
  type GetReportsOverviewPeriod,
} from "@workspace/api-client-react";
import { FormHeader, ChipOption } from "@/components/form";
import { Card, HeroBlock, GroupedList, GroupedRow, INK } from "@/components/ui";

const PERIODS: { value: GetReportsOverviewPeriod; label: string }[] = [
  { value: "day", label: "Hoje" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

const money = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

/**
 * Dez métricas como lista, não como grade de dez cartões.
 *
 * A versão anterior tinha dez StatCards, cada um com sua própria cor — o mesmo
 * problema do dashboard antigo, elevado: nada tinha prioridade, e a cor era
 * decorativa, já que "receita" não é mais verde do que "ticket médio" é âmbar.
 *
 * A receita do período sobe para o bloco escuro e o resto desce para listas
 * agrupadas por assunto. Ler dez números virou percorrer uma coluna.
 */
export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<GetReportsOverviewPeriod>("month");

  const { data, isLoading, isError, error, refetch, isRefetching } =
    useGetReportsOverview({ period });

  const periodLabel = PERIODS.find((option) => option.value === period)?.label ?? "";

  return (
    <View className="flex-1 bg-canvas">
      <StatusBar style="dark" />
      <FormHeader title="Relatórios" />

      <View className="flex-row gap-2 px-5 pb-4">
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
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 96,
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={INK}
          />
        }
      >
        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color={INK} />
          </View>
        ) : isError || !data ? (
          <Card>
            <Text className="text-base font-semibold text-ink">
              Não foi possível carregar os relatórios.
            </Text>
            <Text className="mt-1 text-sm text-ink-muted">
              {error instanceof Error ? error.message : "Erro desconhecido."}
            </Text>
          </Card>
        ) : (
          <>
            <HeroBlock
              label={`Receita · ${periodLabel}`}
              value={money(data.receitaMensal)}
              caption={`Ticket médio de ${money(data.ticketMedio)}`}
              right={
                <Text className="text-sm text-ink-inverse-muted">
                  {money(data.receitaDiaria)} hoje
                </Text>
              }
            />

            <GroupedList title="Clientes">
              <GroupedRow label="Novos" value={String(data.clientesNovos)} />
              <GroupedRow
                label="Recorrentes"
                value={String(data.clientesRecorrentes)}
              />
              <GroupedRow
                label="Retorno médio"
                value={`${data.tempoMedioRetorno} dias`}
              />
              <GroupedRow
                label="Taxa de retorno"
                value={`${data.taxaRetorno}%`}
                last
              />
            </GroupedList>

            <GroupedList title="Campanhas">
              <GroupedRow label="Enviadas" value={String(data.campanhasEnviadas)} />
              <GroupedRow label="Taxa de abertura" value={`${data.taxaAbertura}%`} />
              <GroupedRow
                label="Cupons usados"
                value={String(data.cuponsUsados)}
                last
              />
            </GroupedList>
          </>
        )}
      </ScrollView>
    </View>
  );
}
