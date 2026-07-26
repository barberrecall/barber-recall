import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  Phone,
  Mail,
  Cake,
  CalendarDays,
  MessageCircle,
  Scissors,
} from "lucide-react-native";
import {
  useGetClient,
  useGetClientAppointments,
  type Appointment,
} from "@workspace/api-client-react";
import { RECALL_STATUS_LABEL, RECALL_STATUS_COLOR } from "@/lib/recall-status";
import { Card, Badge, Avatar, EmptyState } from "@/components/ui";

const currency = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

/** Datas do backend são ISO; parseISO evita a variação de fuso do `new Date`. */
const formatDate = (iso: string, pattern: string) =>
  format(parseISO(iso), pattern, { locale: ptBR });

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <Icon size={16} color="#8A94A6" />
      <View className="flex-1">
        <Text className="text-xs text-muted-foreground">{label}</Text>
        <Text className="text-sm text-foreground">{value}</Text>
      </View>
    </View>
  );
}

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  return (
    <Card className="mb-2">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-semibold text-foreground">
            {appointment.servicoNome ?? "Atendimento"}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {formatDate(appointment.data, "d 'de' MMMM 'de' yyyy', às' HH:mm")}
          </Text>
          {appointment.barbeiroNome ? (
            <Text className="text-xs text-muted-foreground">
              com {appointment.barbeiroNome}
            </Text>
          ) : null}
        </View>

        <View className="items-end">
          <Text className="text-sm font-semibold text-foreground">
            {currency(appointment.valorFinal)}
          </Text>
          {appointment.desconto ? (
            <Text className="text-xs text-muted-foreground line-through">
              {currency(appointment.valor)}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
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
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-2 border-b border-border px-2 py-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          className="h-10 w-10 items-center justify-center rounded-lg active:opacity-70"
        >
          <ChevronLeft size={22} color="#8A94A6" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Cliente</Text>
      </View>

      {isLoading ? (
        <View className="items-center py-12">
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      ) : isError || !client ? (
        <View className="p-4">
          <Card>
            <Text className="text-sm font-medium text-destructive">
              Não foi possível carregar o cliente.
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Cliente não encontrado."}
            </Text>
          </Card>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 24,
            gap: 12,
          }}
        >
          <Card>
            <View className="flex-row items-center gap-3">
              <Avatar name={client.nome} />
              <View className="flex-1">
                <Text className="text-lg font-bold text-foreground">
                  {client.nome}
                </Text>
                <View className="mt-1">
                  <Badge
                    label={RECALL_STATUS_LABEL[client.status]}
                    color={RECALL_STATUS_COLOR[client.status]}
                  />
                </View>
              </View>
            </View>

            <Pressable
              onPress={openWhatsApp}
              accessibilityRole="button"
              className="mt-4 h-11 flex-row items-center justify-center gap-2 rounded-lg bg-primary active:opacity-80"
            >
              <MessageCircle size={16} color="#0A0E1A" />
              <Text className="text-sm font-semibold text-primary-foreground">
                Chamar no WhatsApp
              </Text>
            </Pressable>
          </Card>

          <View className="flex-row gap-3">
            <Card className="flex-1">
              <Text className="text-xs text-muted-foreground">Total de visitas</Text>
              <Text className="mt-1 text-2xl font-bold text-foreground">
                {client.totalVisitas}
              </Text>
            </Card>
            <Card className="flex-1">
              <Text className="text-xs text-muted-foreground">Último atendimento</Text>
              <Text className="mt-1 text-sm font-semibold text-foreground">
                {client.ultimoAtendimento
                  ? formatDate(client.ultimoAtendimento, "dd/MM/yyyy")
                  : "Nunca"}
              </Text>
            </Card>
          </View>

          <Card className="gap-3">
            <InfoRow icon={Phone} label="Telefone" value={client.telefone} />
            {client.email ? (
              <InfoRow icon={Mail} label="E-mail" value={client.email} />
            ) : null}
            {client.dataNascimento ? (
              <InfoRow
                icon={Cake}
                label="Nascimento"
                value={formatDate(client.dataNascimento, "dd/MM/yyyy")}
              />
            ) : null}
            <InfoRow
              icon={CalendarDays}
              label="Cliente desde"
              value={formatDate(client.createdAt, "dd/MM/yyyy")}
            />
          </Card>

          {client.observacoes ? (
            <Card>
              <Text className="text-xs text-muted-foreground">Observações</Text>
              <Text className="mt-1 text-sm text-foreground">{client.observacoes}</Text>
            </Card>
          ) : null}

          <Text className="mt-2 text-base font-semibold text-foreground">
            Histórico de atendimentos
          </Text>

          {loadingAppointments ? (
            <ActivityIndicator color="#F59E0B" />
          ) : appointments && appointments.length > 0 ? (
            appointments.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={appointment} />
            ))
          ) : (
            <EmptyState
              icon={Scissors}
              title="Sem atendimentos"
              description="Este cliente ainda não tem atendimentos registrados."
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}
