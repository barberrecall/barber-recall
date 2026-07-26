import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Scissors, Trash2, X, Clock } from "lucide-react-native";
import {
  useListServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  getListServicesQueryKey,
  type Service,
} from "@workspace/api-client-react";
import { Field, FormHeader,
  INK_INVERSE,
  INK_MUTED,
  INK,
} from "@/components/form";
import { Pill, Card, EmptyState } from "@/components/ui";

/** Aceita "45", "45,50" e "45.50" — o teclado decimal varia entre aparelhos. */
const parseMoney = (value: string): number => {
  const parsed = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const money = (value: number) => `R$ ${value.toFixed(2).replace(".", ",")}`;

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, isRefetching } = useListServices();
  const create = useCreateService();
  const update = useUpdateService();
  const remove = useDeleteService();

  const [editing, setEditing] = useState<Service | "new" | null>(null);
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState("");
  const [duracao, setDuracao] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });

  const open = (target: Service | "new") => {
    setEditing(target);
    setFormError(null);
    setNome(target === "new" ? "" : target.nome);
    setValor(target === "new" ? "" : String(target.valor));
    setDuracao(target === "new" ? "30" : String(target.duracao));
  };

  const close = () => {
    setEditing(null);
    setFormError(null);
  };

  const handleSave = async () => {
    const preco = parseMoney(valor);
    const minutos = Number.parseInt(duracao, 10);

    if (!nome.trim()) {
      setFormError("Informe o nome do serviço.");
      return;
    }
    if (!Number.isFinite(preco) || preco < 0) {
      setFormError("Informe um valor válido.");
      return;
    }
    if (!Number.isInteger(minutos) || minutos <= 0) {
      setFormError("Informe a duração em minutos.");
      return;
    }

    try {
      if (editing === "new") {
        await create.mutateAsync({
          data: { nome: nome.trim(), valor: preco, duracao: minutos },
        });
      } else if (editing) {
        await update.mutateAsync({
          id: editing.id,
          data: { nome: nome.trim(), valor: preco, duracao: minutos },
        });
      }

      await invalidate();
      close();
    } catch (err) {
      Alert.alert(
        "Não foi possível salvar",
        err instanceof Error ? err.message : "Erro desconhecido.",
      );
    }
  };

  const handleToggle = async (service: Service) => {
    try {
      await update.mutateAsync({ id: service.id, data: { ativo: !service.ativo } });
      await invalidate();
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Erro desconhecido.");
    }
  };

  const handleDelete = (service: Service) => {
    Alert.alert(
      "Excluir serviço",
      `Excluir ${service.nome}? Os atendimentos já registrados continuam existindo, mas deixam de mostrar o serviço.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await remove.mutateAsync({ id: service.id });
              await invalidate();
              close();
            } catch (err) {
              Alert.alert(
                "Erro",
                err instanceof Error ? err.message : "Erro desconhecido.",
              );
            }
          },
        },
      ],
    );
  };

  const saving = create.isPending || update.isPending;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FormHeader title="Serviços" />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={INK}
          />
        }
      >
        {editing ? (
          <Card className="mb-4 gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-ink">
                {editing === "new" ? "Novo serviço" : "Editar serviço"}
              </Text>
              <Pressable
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                className="h-8 w-8 items-center justify-center active:opacity-70"
              >
                <X size={18} color={INK_MUTED} />
              </Pressable>
            </View>

            <Field
              label="Nome"
              required
              value={nome}
              onChangeText={setNome}
              placeholder="Ex: Corte + Barba"
              editable={!saving}
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field
                  label="Valor (R$)"
                  required
                  value={valor}
                  onChangeText={setValor}
                  placeholder="45"
                  keyboardType="decimal-pad"
                  editable={!saving}
                />
              </View>
              <View className="flex-1">
                <Field
                  label="Duração (min)"
                  required
                  value={duracao}
                  onChangeText={setDuracao}
                  placeholder="30"
                  keyboardType="number-pad"
                  editable={!saving}
                />
              </View>
            </View>

            {formError ? (
              <Text className="text-xs text-ink">{formError}</Text>
            ) : null}

            <Pill
              tone="ink"
              full
              label={editing === "new" ? "Cadastrar" : "Salvar"}
              onPress={handleSave}
              loading={saving}
            />

            {editing !== "new" ? (
              <Pressable
                onPress={() => handleDelete(editing)}
                accessibilityRole="button"
                className="h-11 flex-row items-center justify-center gap-2 rounded-pill border border-ink active:opacity-70"
              >
                <Trash2 size={16} color={INK} />
                <Text className="text-sm font-semibold" style={{ color: INK }}>
                  Excluir serviço
                </Text>
              </Pressable>
            ) : null}
          </Card>
        ) : (
          <Pressable
            onPress={() => open("new")}
            accessibilityRole="button"
            className="mb-4 h-11 flex-row items-center justify-center gap-2 rounded-pill bg-hero active:opacity-80"
          >
            <Plus size={16} color={INK_INVERSE} />
            <Text className="text-sm font-semibold text-ink-inverse">
              Novo serviço
            </Text>
          </Pressable>
        )}

        {isLoading ? (
          <ActivityIndicator color={INK} />
        ) : isError ? (
          <Card>
            <Text className="text-sm text-ink">
              Não foi possível carregar os serviços.
            </Text>
            <Text className="mt-1 text-xs text-ink-muted">
              {error instanceof Error ? error.message : "Erro desconhecido."}
            </Text>
          </Card>
        ) : data && data.length > 0 ? (
          data.map((service) => (
            <Pressable
              key={service.id}
              onPress={() => open(service)}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${service.nome}`}
              className="active:opacity-70"
            >
              <Card className="mb-2">
                <View className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-ink">
                      {service.nome}
                    </Text>
                    <View className="mt-0.5 flex-row items-center gap-2">
                      <Text className="text-sm font-semibold text-ink">
                        {money(service.valor)}
                      </Text>
                      <View className="flex-row items-center gap-1">
                        <Clock size={11} color={INK_MUTED} />
                        <Text className="text-xs text-ink-muted">
                          {service.duracao} min
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Switch
                    value={service.ativo}
                    onValueChange={() => handleToggle(service)}
                    trackColor={{ false: "#E6E6EA", true: INK }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </Card>
            </Pressable>
          ))
        ) : (
          <EmptyState
            icon={Scissors}
            title="Nenhum serviço"
            description="Cadastre os serviços para preencher o valor automaticamente ao registrar um atendimento."
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
