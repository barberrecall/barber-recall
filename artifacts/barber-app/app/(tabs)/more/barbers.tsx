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
import { Plus, Users, Trash2, X } from "lucide-react-native";
import {
  useListBarbers,
  useCreateBarber,
  useUpdateBarber,
  useDeleteBarber,
  getListBarbersQueryKey,
  type Barber,
} from "@workspace/api-client-react";
import { Field, FormHeader,
  INK_INVERSE,
  INK_MUTED,
  INK,
} from "@/components/form";
import { Pill, Card, Avatar, EmptyState } from "@/components/ui";

export default function BarbersScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, isRefetching } = useListBarbers();
  const create = useCreateBarber();
  const update = useUpdateBarber();
  const remove = useDeleteBarber();

  // `null` = formulário fechado; `Barber` = editando; `"new"` = cadastrando.
  const [editing, setEditing] = useState<Barber | "new" | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListBarbersQueryKey() });

  const open = (target: Barber | "new") => {
    setEditing(target);
    setFormError(null);
    setNome(target === "new" ? "" : target.nome);
    setTelefone(target === "new" ? "" : (target.telefone ?? ""));
  };

  const close = () => {
    setEditing(null);
    setFormError(null);
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      setFormError("Informe o nome do barbeiro.");
      return;
    }

    try {
      if (editing === "new") {
        await create.mutateAsync({
          data: {
            nome: nome.trim(),
            ...(telefone.trim() ? { telefone: telefone.trim() } : {}),
          },
        });
      } else if (editing) {
        await update.mutateAsync({
          id: editing.id,
          // Vazio vira limpeza do campo, não "não mexer" — o servidor converte
          // string vazia em null nas colunas nuláveis.
          data: { nome: nome.trim(), telefone: telefone.trim() },
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

  const handleToggle = async (barber: Barber) => {
    try {
      await update.mutateAsync({ id: barber.id, data: { ativo: !barber.ativo } });
      await invalidate();
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Erro desconhecido.");
    }
  };

  const handleDelete = (barber: Barber) => {
    Alert.alert(
      "Excluir barbeiro",
      `Excluir ${barber.nome}? Os atendimentos já registrados por ele continuam existindo, mas deixam de mostrar o nome.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await remove.mutateAsync({ id: barber.id });
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
      <FormHeader title="Barbeiros" />

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
                {editing === "new" ? "Novo barbeiro" : "Editar barbeiro"}
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
              placeholder="Ex: Carlos Mendes"
              autoCapitalize="words"
              editable={!saving}
            />

            <Field
              label="Telefone"
              value={telefone}
              onChangeText={setTelefone}
              placeholder="opcional"
              keyboardType="phone-pad"
              editable={!saving}
            />

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
                  Excluir barbeiro
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
              Novo barbeiro
            </Text>
          </Pressable>
        )}

        {isLoading ? (
          <ActivityIndicator color={INK} />
        ) : isError ? (
          <Card>
            <Text className="text-sm text-ink">
              Não foi possível carregar os barbeiros.
            </Text>
            <Text className="mt-1 text-xs text-ink-muted">
              {error instanceof Error ? error.message : "Erro desconhecido."}
            </Text>
          </Card>
        ) : data && data.length > 0 ? (
          data.map((barber) => (
            <Pressable
              key={barber.id}
              onPress={() => open(barber)}
              accessibilityRole="button"
              accessibilityLabel={`Editar ${barber.nome}`}
              className="active:opacity-70"
            >
              <Card className="mb-2">
                <View className="flex-row items-center gap-3">
                  <Avatar name={barber.nome} />

                  <View className="flex-1">
                    <Text className="text-base font-semibold text-ink">
                      {barber.nome}
                    </Text>
                    <Text className="text-xs text-ink-muted">
                      {barber.telefone || "sem telefone"}
                    </Text>
                  </View>

                  <Switch
                    value={barber.ativo}
                    onValueChange={() => handleToggle(barber)}
                    trackColor={{ false: "#E6E6EA", true: INK }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </Card>
            </Pressable>
          ))
        ) : (
          <EmptyState
            icon={Users}
            title="Nenhum barbeiro"
            description="Cadastre a equipe para poder filtrar a agenda por barbeiro."
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
