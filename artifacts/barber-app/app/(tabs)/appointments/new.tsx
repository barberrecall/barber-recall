import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Check } from "lucide-react-native";
import {
  useListClients,
  useListBarbers,
  useListServices,
  useCreateAppointment,
  getListAppointmentsQueryKey,
  getListClientsQueryKey,
  getGetDashboardStatsQueryKey,
  type Client,
} from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Field, FormHeader, ChipOption, FormSection,
  INK_MUTED,
  INK,
} from "@/components/form";
import { Pill, Card, Avatar } from "@/components/ui";

const parseMoney = (value: string): number => {
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMoney = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

function ClientPicker({
  selected,
  onSelect,
}: {
  selected: Client | null;
  /** `null` limpa a seleção e devolve a busca. */
  onSelect: (client: Client | null) => void;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 400);

  const { data: clients, isLoading } = useListClients(
    debounced.trim() ? { search: debounced.trim() } : undefined,
  );

  if (selected) {
    return (
      <Card>
        <View className="flex-row items-center gap-3">
          <Avatar name={selected.nome} />
          <View className="flex-1">
            <Text className="text-base font-semibold text-ink">
              {selected.nome}
            </Text>
            <Text className="text-xs text-ink-muted">{selected.telefone}</Text>
          </View>
          <Pressable
            onPress={() => onSelect(null)}
            accessibilityRole="button"
            className="active:opacity-70"
          >
            <Text className="text-xs font-medium text-ink">Trocar</Text>
          </Pressable>
        </View>
      </Card>
    );
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2 rounded-pill border border-hairline bg-surface px-3">
        <Search size={16} color={INK_MUTED} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar cliente por nome ou telefone"
          placeholderTextColor={INK_MUTED}
          className="h-11 flex-1 text-base text-ink"
          autoCapitalize="none"
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={INK} />
      ) : (
        (clients ?? []).slice(0, 6).map((client) => (
          <Pressable
            key={client.id}
            onPress={() => onSelect(client)}
            accessibilityRole="button"
            className="active:opacity-70"
          >
            <Card>
              <View className="flex-row items-center gap-3">
                <Avatar name={client.nome} />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-ink">
                    {client.nome}
                  </Text>
                  <Text className="text-xs text-ink-muted">
                    {client.telefone}
                  </Text>
                </View>
              </View>
            </Card>
          </Pressable>
        ))
      )}

      {!isLoading && (clients ?? []).length === 0 ? (
        <Text className="py-2 text-center text-xs text-ink-muted">
          Nenhum cliente encontrado.
        </Text>
      ) : null}
    </View>
  );
}

export default function NewAppointmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  // Permite chegar aqui já com o cliente escolhido, vindo da tela de detalhe.
  const { clienteId } = useLocalSearchParams<{ clienteId?: string }>();

  const { data: barbers } = useListBarbers();
  const { data: services } = useListServices();
  const { data: preselected } = useListClients();

  const [client, setClient] = useState<Client | null>(null);
  const [barbeiroId, setBarbeiroId] = useState<number | null>(null);
  const [servicoId, setServicoId] = useState<number | null>(null);
  const [valor, setValor] = useState("0");
  const [desconto, setDesconto] = useState("0");
  const [cupom, setCupom] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createAppointment = useCreateAppointment();

  // Resolve o cliente pré-selecionado da URL uma vez que a lista tenha chegado.
  const resolvedClient = useMemo(() => {
    if (client) return client;
    if (!clienteId || !preselected) return null;
    return preselected.find((item) => item.id === Number(clienteId)) ?? null;
  }, [client, clienteId, preselected]);

  /** Escolher um serviço preenche o valor, mas o barbeiro ainda pode ajustar. */
  const handleService = (id: number, preco: number) => {
    setServicoId(id);
    setValor(String(preco));
  };

  const valorFinal = Math.max(0, parseMoney(valor) - parseMoney(desconto));

  const handleSubmit = async () => {
    if (!resolvedClient) {
      setError("Selecione um cliente.");
      return;
    }

    setError(null);

    try {
      await createAppointment.mutateAsync({
        data: {
          clienteId: resolvedClient.id,
          // Campos opcionais só entram quando escolhidos — enviar null aqui
          // faria o backend gravar a ausência como um valor.
          ...(barbeiroId ? { barbeiroId } : {}),
          ...(servicoId ? { servicoId } : {}),
          valor: parseMoney(valor),
          desconto: parseMoney(desconto),
          // O servidor calcula o desconto do cupom e ignora o que mandamos —
          // quem decide quanto um cupom vale é o cupom, não a tela.
          ...(cupom.trim() ? { couponCode: cupom.trim().toUpperCase() } : {}),
          valorFinal,
          // Registro do que acabou de acontecer: a data é agora. Datas futuras
          // não contam como visita (skill `atendimentos-scheduling`).
          data: new Date().toISOString(),
          ...(observacoes.trim() ? { observacoes: observacoes.trim() } : {}),
        },
      });

      // O atendimento mexe no recall do cliente, então lista de clientes e KPIs
      // do dashboard ficam obsoletos junto com a agenda.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() }),
      ]);

      router.back();
    } catch (err) {
      Alert.alert(
        "Não foi possível registrar",
        err instanceof Error ? err.message : "Erro desconhecido.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FormHeader title="Novo atendimento" />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <FormSection title="Cliente">
          <ClientPicker selected={resolvedClient} onSelect={setClient} />
          {error ? <Text className="text-xs text-ink">{error}</Text> : null}
        </FormSection>

        {services && services.length > 0 ? (
          <FormSection title="Serviço">
            <View className="flex-row flex-wrap gap-2">
              {services.map((service) => (
                <ChipOption
                  key={service.id}
                  label={`${service.nome} · ${formatMoney(service.valor)}`}
                  selected={servicoId === service.id}
                  onPress={() => handleService(service.id, service.valor)}
                />
              ))}
            </View>
          </FormSection>
        ) : null}

        {barbers && barbers.length > 0 ? (
          <FormSection title="Barbeiro">
            <View className="flex-row flex-wrap gap-2">
              {barbers.map((barber) => (
                <ChipOption
                  key={barber.id}
                  label={barber.nome}
                  selected={barbeiroId === barber.id}
                  onPress={() =>
                    setBarbeiroId((current) =>
                      current === barber.id ? null : barber.id,
                    )
                  }
                />
              ))}
            </View>
          </FormSection>
        ) : null}

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Field
              label="Valor"
              value={valor}
              onChangeText={setValor}
              keyboardType="decimal-pad"
              editable={!createAppointment.isPending}
            />
          </View>
          <View className="flex-1">
            <Field
              label="Desconto"
              value={desconto}
              onChangeText={setDesconto}
              keyboardType="decimal-pad"
              editable={!createAppointment.isPending}
            />
          </View>
        </View>

        <Field
          label="Cupom"
          value={cupom}
          onChangeText={(t) => setCupom(t.toUpperCase())}
          placeholder="opcional"
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!createAppointment.isPending}
        />

        {cupom.trim() ? (
          <Text className="-mt-2 text-xs text-ink-muted">
            O desconto do cupom é calculado ao salvar e substitui o valor acima.
          </Text>
        ) : null}

        <Card>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-ink-muted">Total</Text>
            <Text className="text-2xl font-bold text-ink">
              {formatMoney(valorFinal)}
            </Text>
          </View>
        </Card>

        <Field
          label="Observações"
          value={observacoes}
          onChangeText={setObservacoes}
          placeholder="opcional"
          multiline
          numberOfLines={3}
          style={{ textAlignVertical: "top", minHeight: 80 }}
          editable={!createAppointment.isPending}
        />

        <Pill
          tone="ink"
          full
          label="Registrar atendimento"
          onPress={handleSubmit}
          loading={createAppointment.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
