import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  MessageCircle,
  Scissors,
  Pencil,
  Plus,
} from "lucide-react-native";
import {
  useGetClient,
  useGetClientAppointments,
  type Appointment,
} from "@workspace/api-client-react";
import { RECALL_STATUS_LABEL_LONG } from "@/lib/recall-status";
import {
  HeroBlock,
  Card,
  Avatar,
  EmptyState,
  GroupedList,
  GroupedRow,
  SectionTitle,
  Pill,
  INK,
  INK_MUTED,
} from "@/components/ui";
import { StatusMark } from "@/components/status-mark";

const money = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

/** Datas do backend são ISO; parseISO evita a variação de fuso do `new Date`. */
const formatDate = (iso: string, pattern: string) =>
  format(parseISO(iso), pattern, { locale: ptBR });

function AppointmentRow({
  appointment,
  last,
}: {
  appointment: Appointment;
  last: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between px-5 py-4 ${
        last ? "" : "border-b border-hairline"
      }`}
    >
      <View className="flex-1">
        <Text className="text-base text-ink">
          {appointment.servicoNome ?? "Atendimento"}
        </Text>
        <Text className="mt-0.5 text-sm text-ink-muted">
          {formatDate(appointment.data, "d MMM yyyy")}
          {appointment.barbeiroNome ? ` · ${appointment.barbeiroNome}` : ""}
        </Text>
      </View>

      <Text className="text-base font-semibold text-ink">
        {money(appointment.valorFinal)}
      </Text>
    </View>
  );
}

export default function ClientDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const clientId = Number(id);

  const { data: client, isLoading, isError, error } = useGetClient(clientId);
  const { data: appointments, isLoading: loadingAppointments } =
    useGetClientAppointments(clientId);

  /**
   * Abre a conversa no WhatsApp. O deeplink `wa.me` é o mesmo mecanismo do CRM
   * web, então o número segue a mesma normalização: só dígitos, com o 55 do
   * Brasil quando o cadastro veio sem código de país.
   */
  const openWhatsApp = () => {
    if (!client) return;
    const digits = client.telefone.replace(/\D/g, "");
    const number = digits.startsWith("55") ? digits : `55${digits}`;
    void Linking.openURL(`https://wa.me/${number}`);
  };

  return (
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      <View className="flex-row items-center justify-between px-3 py-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          className="h-11 w-11 items-center justify-center rounded-pill active:opacity-60"
        >
          <ChevronLeft size={24} color={INK} />
        </Pressable>

        {client ? (
          <Pressable
            onPress={() => router.push(`/clients/${clientId}/edit`)}
            accessibilityRole="button"
            accessibilityLabel="Editar cliente"
            className="h-11 w-11 items-center justify-center rounded-pill active:opacity-60"
          >
            <Pencil size={19} color={INK_MUTED} />
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View className="items-center py-16">
          <ActivityIndicator size="large" color={INK} />
        </View>
      ) : isError || !client ? (
        <View className="px-5">
          <Card>
            <Text className="text-base font-semibold text-ink">
              Não foi possível carregar o cliente.
            </Text>
            <Text className="mt-1 text-sm text-ink-muted">
              {error instanceof Error ? error.message : "Cliente não encontrado."}
            </Text>
          </Card>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 96,
            gap: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Nome e status como bloco de assinatura, não como cabeçalho de card. */}
          <View className="items-center pt-2">
            <Avatar name={client.nome} size={72} />
            <Text className="mt-3 text-2xl font-extrabold text-ink" numberOfLines={2}>
              {client.nome}
            </Text>
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <StatusMark status={client.status} showLabel={false} />
              <Text className="text-base text-ink-muted">
                {RECALL_STATUS_LABEL_LONG[client.status]}
              </Text>
            </View>
          </View>

          <Pill
            tone="ink"
            full
            label="Chamar no WhatsApp"
            icon={MessageCircle}
            onPress={openWhatsApp}
          />

          <HeroBlock
            label="Histórico"
            value={String(client.totalVisitas)}
            caption={
              client.totalVisitas === 1 ? "visita registrada" : "visitas registradas"
            }
            right={
              <Text className="text-sm text-ink-inverse-muted">
                {client.ultimoAtendimento
                  ? formatDate(client.ultimoAtendimento, "d MMM")
                  : "—"}
              </Text>
            }
          />

          <GroupedList title="Contato">
            <GroupedRow label="Telefone" value={client.telefone} />
            {client.email ? <GroupedRow label="E-mail" value={client.email} /> : null}
            {client.dataNascimento ? (
              <GroupedRow
                label="Nascimento"
                value={formatDate(client.dataNascimento, "dd/MM/yyyy")}
              />
            ) : null}
            <GroupedRow
              label="Cliente desde"
              value={formatDate(client.createdAt, "dd/MM/yyyy")}
              last
            />
          </GroupedList>

          {client.observacoes ? (
            <GroupedList title="Observações">
              <GroupedRow label={client.observacoes} last />
            </GroupedList>
          ) : null}

          <View>
            <SectionTitle
              title="Atendimentos"
              right={
                <Pressable
                  onPress={() => router.push(`/appointments/new?clienteId=${clientId}`)}
                  accessibilityRole="button"
                  accessibilityLabel="Registrar atendimento"
                  className="h-9 flex-row items-center gap-1 rounded-pill bg-surface px-3 active:opacity-70"
                >
                  <Plus size={14} color={INK} />
                  <Text className="text-sm font-semibold text-ink">Novo</Text>
                </Pressable>
              }
            />

            {loadingAppointments ? (
              <ActivityIndicator color={INK} />
            ) : appointments && appointments.length > 0 ? (
              <View className="overflow-hidden rounded-card bg-surface">
                {appointments.map((appointment, index) => (
                  <AppointmentRow
                    key={appointment.id}
                    appointment={appointment}
                    last={index === appointments.length - 1}
                  />
                ))}
              </View>
            ) : (
              <Card>
                <EmptyState
                  icon={Scissors}
                  title="Sem atendimentos"
                  description="Nada registrado para este cliente ainda."
                />
              </Card>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
