import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { format, parseISO, addDays, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Banknote,
  Plus,
} from "lucide-react-native";
import {
  useListAppointments,
  useListBarbers,
  type Appointment,
} from "@workspace/api-client-react";
import { Card, Avatar, EmptyState } from "@/components/ui";

const currency = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

/** O servidor compara `DATE(data) = date`, então o filtro vai como YYYY-MM-DD. */
const toApiDate = (date: Date) => format(date, "yyyy-MM-dd");

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const nome = appointment.clienteNome ?? "Cliente";

  return (
    <Card className="mb-2">
      <View className="flex-row items-center gap-3">
        <Avatar name={nome} />

        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {nome}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {appointment.servicoNome ?? "Atendimento"}
            {appointment.barbeiroNome ? ` · ${appointment.barbeiroNome}` : ""}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-sm font-bold text-foreground">
            {currency(appointment.valorFinal)}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {format(parseISO(appointment.data), "HH:mm")}
          </Text>
        </View>
      </View>
    </Card>
  );
}

export default function AppointmentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [date, setDate] = useState(() => new Date());
  const [barberId, setBarberId] = useState<number | "all">("all");

  const { data: barbers } = useListBarbers();

  const {
    data: appointments,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useListAppointments({
    date: toApiDate(date),
    ...(barberId !== "all" ? { barberId } : {}),
  });

  /**
   * Faturamento do Dia — soma de `valorFinal` dos atendimentos da data
   * filtrada, calculada no cliente exatamente como o CRM web faz
   * (`pages/appointments/index.tsx`), para que as duas telas nunca mostrem
   * números diferentes para o mesmo indicador.
   */
  const faturamento = useMemo(
    () => (appointments ?? []).reduce((sum, item) => sum + item.valorFinal, 0),
    [appointments],
  );

  const list = appointments ?? [];

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="gap-3 border-b border-border px-4 pb-3 pt-2">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-bold text-foreground">Atendimentos</Text>

          <Pressable
            onPress={() => router.push("/appointments/new")}
            accessibilityRole="button"
            accessibilityLabel="Registrar atendimento"
            className="h-9 flex-row items-center gap-1.5 rounded-lg bg-primary px-3 active:opacity-80"
          >
            <Plus size={14} color="#0A0E1A" />
            <Text className="text-xs font-semibold text-primary-foreground">Novo</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between rounded-lg border border-border bg-card px-2 py-1.5">
          <Pressable
            onPress={() => setDate((current) => addDays(current, -1))}
            accessibilityRole="button"
            accessibilityLabel="Dia anterior"
            className="h-9 w-9 items-center justify-center rounded-md active:opacity-70"
          >
            <ChevronLeft size={20} color="#8A94A6" />
          </Pressable>

          <Pressable
            onPress={() => setDate(new Date())}
            accessibilityRole="button"
            accessibilityLabel="Ir para hoje"
            className="flex-1 items-center active:opacity-70"
          >
            <Text className="text-sm font-semibold capitalize text-foreground">
              {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </Text>
            {!isToday(date) ? (
              <Text className="text-xs text-primary">toque para voltar a hoje</Text>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => setDate((current) => addDays(current, 1))}
            accessibilityRole="button"
            accessibilityLabel="Próximo dia"
            className="h-9 w-9 items-center justify-center rounded-md active:opacity-70"
          >
            <ChevronRight size={20} color="#8A94A6" />
          </Pressable>
        </View>

        {barbers && barbers.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {[{ id: "all" as const, nome: "Todos" }, ...barbers].map((barber) => {
              const selected = barberId === barber.id;
              return (
                <Pressable
                  key={String(barber.id)}
                  onPress={() => setBarberId(barber.id as number | "all")}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className={`rounded-full border px-3 py-1.5 active:opacity-70 ${
                    selected ? "border-primary bg-primary" : "border-border bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      selected ? "text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {barber.nome}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      {isLoading ? (
        <View className="items-center py-12">
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : isError ? (
        <View className="p-4">
          <Card>
            <Text className="text-sm font-medium text-destructive">
              Não foi possível carregar os atendimentos.
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Erro desconhecido."}
            </Text>
          </Card>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#F59E0B"
            />
          }
          ListHeaderComponent={
            list.length > 0 ? (
              <Card className="mb-3">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Banknote size={16} color="#10B981" />
                    <Text className="text-xs font-medium text-primary">
                      Faturamento do Dia
                    </Text>
                  </View>
                  <Text className="text-xs text-muted-foreground">
                    {list.length} {list.length === 1 ? "atendimento" : "atendimentos"}
                  </Text>
                </View>
                <Text className="mt-1 text-2xl font-bold text-foreground">
                  {currency(faturamento)}
                </Text>
              </Card>
            ) : null
          }
          renderItem={({ item }) => <AppointmentRow appointment={item} />}
          ListEmptyComponent={
            <EmptyState
              icon={CalendarDays}
              title="Nenhum atendimento para esta data"
              description={
                barberId !== "all"
                  ? "Tente remover o filtro de barbeiro ou escolher outro dia."
                  : "Escolha outro dia usando as setas acima."
              }
            />
          }
        />
      )}
    </View>
  );
}
