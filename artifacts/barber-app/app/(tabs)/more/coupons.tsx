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
import { format, parseISO, isBefore } from "date-fns";
import { Ticket, Plus, Trash2, X } from "lucide-react-native";
import {
  useListCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
  getListCouponsQueryKey,
  type Coupon,
  type CouponInputTipo,
} from "@workspace/api-client-react";
import { Field, FormHeader, ChipOption } from "@/components/form";
import { Button, Card, Badge, EmptyState } from "@/components/ui";
import { toIsoDate, fromIsoDate } from "@/components/client-form";

const formatDiscount = (coupon: Coupon) =>
  coupon.tipo === "percent"
    ? `${coupon.valor}%`
    : `R$ ${coupon.valor.toFixed(2).replace(".", ",")}`;

const parseNumber = (value: string): number => {
  const parsed = Number.parseFloat(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export default function CouponsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, isRefetching } = useListCoupons();
  const create = useCreateCoupon();
  const update = useUpdateCoupon();
  const remove = useDeleteCoupon();

  const [editing, setEditing] = useState<Coupon | "new" | null>(null);
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<CouponInputTipo>("percent");
  const [valor, setValor] = useState("");
  const [validade, setValidade] = useState("");
  const [usoMaximo, setUsoMaximo] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListCouponsQueryKey() });

  const open = (target: Coupon | "new") => {
    setEditing(target);
    setFormError(null);
    setCodigo(target === "new" ? "" : target.codigo);
    setTipo(target === "new" ? "percent" : (target.tipo as CouponInputTipo));
    setValor(target === "new" ? "" : String(target.valor));
    setValidade(target === "new" ? "" : fromIsoDate(target.validade));
    setUsoMaximo(
      target === "new" ? "" : target.usoMaximo != null ? String(target.usoMaximo) : "",
    );
  };

  const close = () => {
    setEditing(null);
    setFormError(null);
  };

  const handleSave = async () => {
    const desconto = parseNumber(valor);

    if (!Number.isFinite(desconto) || desconto <= 0) {
      setFormError("Informe o valor do desconto.");
      return;
    }
    if (tipo === "percent" && desconto > 100) {
      setFormError("Um desconto percentual não passa de 100%.");
      return;
    }
    if (validade.trim() && !toIsoDate(validade)) {
      setFormError("Use o formato dd/mm/aaaa na validade.");
      return;
    }

    const limite = usoMaximo.trim() ? Number.parseInt(usoMaximo, 10) : null;
    if (limite !== null && (!Number.isInteger(limite) || limite < 1)) {
      setFormError("O uso máximo deve ser um número maior que zero.");
      return;
    }

    try {
      if (editing === "new") {
        await create.mutateAsync({
          data: {
            // `codigo` vazio é omitido: o servidor gera um código único.
            ...(codigo.trim() ? { codigo: codigo.trim().toUpperCase() } : {}),
            tipo,
            valor: desconto,
            ...(toIsoDate(validade) ? { validade: toIsoDate(validade) } : {}),
            ...(limite !== null ? { usoMaximo: limite } : {}),
          },
        });
      } else if (editing) {
        await update.mutateAsync({
          id: editing.id,
          data: {
            codigo: codigo.trim().toUpperCase(),
            tipo,
            valor: desconto,
            // Vazio limpa o campo — o servidor converte para null.
            validade: toIsoDate(validade) ?? "",
            usoMaximo: (limite ?? "") as unknown as number,
          },
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

  const handleToggle = async (coupon: Coupon) => {
    try {
      await update.mutateAsync({ id: coupon.id, data: { ativo: !coupon.ativo } });
      await invalidate();
    } catch (err) {
      Alert.alert("Erro", err instanceof Error ? err.message : "Erro desconhecido.");
    }
  };

  const handleDelete = (coupon: Coupon) => {
    Alert.alert(
      "Excluir cupom",
      `Excluir ${coupon.codigo}? Campanhas que usam este cupom passam a enviar a mensagem sem o desconto.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await remove.mutateAsync({ id: coupon.id });
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
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FormHeader title="Cupons" />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#F59E0B"
          />
        }
      >
        {editing ? (
          <Card className="mb-4 gap-3">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-foreground">
                {editing === "new" ? "Novo cupom" : "Editar cupom"}
              </Text>
              <Pressable
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                className="h-8 w-8 items-center justify-center active:opacity-70"
              >
                <X size={18} color="#8A94A6" />
              </Pressable>
            </View>

            <Field
              label="Código"
              value={codigo}
              onChangeText={setCodigo}
              placeholder={editing === "new" ? "deixe vazio para gerar" : ""}
              autoCapitalize="characters"
              editable={!saving}
            />

            <View className="gap-2">
              <Text className="text-sm font-medium text-foreground">
                Tipo de desconto<Text className="text-destructive"> *</Text>
              </Text>
              <View className="flex-row gap-2">
                <ChipOption
                  label="Percentual (%)"
                  selected={tipo === "percent"}
                  onPress={() => setTipo("percent")}
                />
                <ChipOption
                  label="Valor fixo (R$)"
                  selected={tipo === "fixed"}
                  onPress={() => setTipo("fixed")}
                />
              </View>
            </View>

            <Field
              label={tipo === "percent" ? "Desconto (%)" : "Desconto (R$)"}
              required
              value={valor}
              onChangeText={setValor}
              placeholder={tipo === "percent" ? "10" : "15"}
              keyboardType="decimal-pad"
              editable={!saving}
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field
                  label="Validade"
                  value={validade}
                  onChangeText={setValidade}
                  placeholder="dd/mm/aaaa"
                  keyboardType="numbers-and-punctuation"
                  editable={!saving}
                />
              </View>
              <View className="flex-1">
                <Field
                  label="Uso máximo"
                  value={usoMaximo}
                  onChangeText={setUsoMaximo}
                  placeholder="ilimitado"
                  keyboardType="number-pad"
                  editable={!saving}
                />
              </View>
            </View>

            {formError ? (
              <Text className="text-xs text-destructive">{formError}</Text>
            ) : null}

            <Button
              label={editing === "new" ? "Criar cupom" : "Salvar"}
              onPress={handleSave}
              loading={saving}
            />

            {editing !== "new" ? (
              <Pressable
                onPress={() => handleDelete(editing)}
                accessibilityRole="button"
                className="h-11 flex-row items-center justify-center gap-2 rounded-lg border border-destructive active:opacity-70"
              >
                <Trash2 size={16} color="#EF4444" />
                <Text className="text-sm font-semibold" style={{ color: "#EF4444" }}>
                  Excluir cupom
                </Text>
              </Pressable>
            ) : null}
          </Card>
        ) : (
          <Pressable
            onPress={() => open("new")}
            accessibilityRole="button"
            className="mb-4 h-11 flex-row items-center justify-center gap-2 rounded-lg bg-primary active:opacity-80"
          >
            <Plus size={16} color="#0A0E1A" />
            <Text className="text-sm font-semibold text-primary-foreground">
              Novo cupom
            </Text>
          </Pressable>
        )}

        {isLoading ? (
          <ActivityIndicator color="#F59E0B" />
        ) : isError ? (
          <Card>
            <Text className="text-sm text-destructive">
              Não foi possível carregar os cupons.
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Erro desconhecido."}
            </Text>
          </Card>
        ) : data && data.length > 0 ? (
          data.map((coupon) => {
            const expirado =
              coupon.validade != null &&
              isBefore(parseISO(coupon.validade), new Date());
            const esgotado =
              coupon.usoMaximo != null && coupon.usoAtual >= coupon.usoMaximo;

            return (
              <Pressable
                key={coupon.id}
                onPress={() => open(coupon)}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${coupon.codigo}`}
                className="active:opacity-70"
              >
                <Card className="mb-2">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="text-base font-bold text-foreground">
                        {coupon.codigo}
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        {formatDiscount(coupon)} de desconto
                      </Text>

                      {/* Três motivos distintos para um cupom não valer, cada um
                          pedindo uma ação diferente do barbeiro. */}
                      <View className="mt-1.5 flex-row flex-wrap gap-2">
                        {!coupon.ativo ? (
                          <Badge label="Desligado" color="#8A94A6" />
                        ) : null}
                        {expirado ? <Badge label="Vencido" color="#EF4444" /> : null}
                        {esgotado ? <Badge label="Esgotado" color="#F97316" /> : null}
                        {coupon.ativo && !expirado && !esgotado ? (
                          <Badge label="Válido" color="#10B981" />
                        ) : null}
                      </View>
                    </View>

                    <View className="items-end gap-1">
                      <Text className="text-sm font-semibold text-foreground">
                        {coupon.usoAtual}
                        {coupon.usoMaximo != null ? `/${coupon.usoMaximo}` : ""}
                      </Text>
                      <Text className="text-xs text-muted-foreground">usos</Text>
                      {coupon.validade ? (
                        <Text className="text-xs text-muted-foreground">
                          até {format(parseISO(coupon.validade), "dd/MM/yy")}
                        </Text>
                      ) : null}
                      <Switch
                        value={coupon.ativo}
                        onValueChange={() => handleToggle(coupon)}
                        trackColor={{ false: "#3A4356", true: "#F59E0B" }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })
        ) : (
          <EmptyState
            icon={Ticket}
            title="Nenhum cupom"
            description="Crie um cupom para anexar a uma campanha de retorno."
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
