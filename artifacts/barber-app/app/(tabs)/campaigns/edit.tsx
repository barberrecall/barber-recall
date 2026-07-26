import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Info, Trash2 } from "lucide-react-native";
import {
  useListCampaigns,
  useListCoupons,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useGetBarbershop,
  getListCampaignsQueryKey,
  getListNotificationsQueryKey,
  type CampaignInputTipo,
} from "@workspace/api-client-react";
import { Field, FormHeader, ChipOption, FormSection } from "@/components/form";
import { Button, Card } from "@/components/ui";
import { CAMPAIGN_TIPO_LABEL, describeCampaignTrigger } from "@/lib/campaign-labels";

const TIPOS: CampaignInputTipo[] = ["return", "birthday", "loyalty", "custom"];

/**
 * Variáveis que o servidor substitui em `resolveMessage`.
 *
 * São oferecidas para toque em vez de só documentadas: digitar `{nome}` à mão
 * erra fácil, e uma variável escrita errado não falha — ela simplesmente chega
 * literal no WhatsApp do cliente.
 */
const VARIAVEIS = [
  { token: "{nome}", hint: "nome do cliente" },
  { token: "{barbearia}", hint: "nome da barbearia" },
  { token: "{dias}", hint: "dias sem visitar" },
  { token: "{cupom_texto}", hint: "cupom anexado" },
];

/** O rótulo de `dias` muda com o tipo, porque o significado muda. */
function diasLabel(tipo: CampaignInputTipo): string {
  switch (tipo) {
    case "return":
    case "custom":
      return "Dias sem visitar";
    case "birthday":
      return "Dias antes do aniversário";
    case "loyalty":
      return "Meta de visitas";
  }
}

export default function CampaignEditScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const isNew = !id;
  const campaignId = id ? Number(id) : null;

  const { data: campaigns, isLoading } = useListCampaigns();
  const { data: coupons } = useListCoupons();
  const { data: shop } = useGetBarbershop();

  const create = useCreateCampaign();
  const update = useUpdateCampaign();
  const remove = useDeleteCampaign();

  const existing = campaignId
    ? campaigns?.find((item) => item.id === campaignId)
    : undefined;

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<CampaignInputTipo>("return");
  const [dias, setDias] = useState("30");
  const [mensagem, setMensagem] = useState("");
  const [cupomId, setCupomId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Preenche uma vez, quando a campanha chega da API.
  useEffect(() => {
    if (!existing) return;
    setNome(existing.nome);
    setTipo(existing.tipo as CampaignInputTipo);
    setDias(String(existing.dias));
    setMensagem(existing.mensagem);
    setCupomId(existing.cupomId ?? null);
  }, [existing]);

  const diasRetorno = shop?.diasRetorno ?? 30;
  const diasNumero = Number.parseInt(dias, 10);

  /**
   * O recall é o piso: o gatilho efetivo é max(diasRetorno, campaign.dias).
   * Sem avisar isso, baixar o `dias` daria a impressão de antecipar o disparo
   * quando na verdade nada muda (skill `campanhas-whatsapp`).
   */
  const diasIgnorado =
    (tipo === "return" || tipo === "custom") &&
    Number.isInteger(diasNumero) &&
    diasNumero < diasRetorno;

  const insertVariable = (token: string) =>
    setMensagem((current) => `${current}${current.endsWith(" ") || !current ? "" : " "}${token}`);

  const handleSave = async () => {
    if (!nome.trim()) {
      setFormError("Informe o nome da campanha.");
      return;
    }
    if (!Number.isInteger(diasNumero) || diasNumero < 0) {
      setFormError("Informe um número válido.");
      return;
    }
    if (!mensagem.trim()) {
      setFormError("Escreva a mensagem que será enviada.");
      return;
    }

    setFormError(null);

    try {
      if (isNew) {
        await create.mutateAsync({
          data: {
            nome: nome.trim(),
            tipo,
            dias: diasNumero,
            mensagem: mensagem.trim(),
            ...(cupomId ? { cupomId } : {}),
          },
        });
      } else if (campaignId) {
        await update.mutateAsync({
          id: campaignId,
          data: {
            nome: nome.trim(),
            tipo,
            dias: diasNumero,
            mensagem: mensagem.trim(),
            // Vazio desanexa o cupom — o servidor converte para null.
            cupomId: (cupomId ?? "") as unknown as number,
          },
        });
      }

      // Mudar a campanha muda quem entra nos disparos, então a lista de
      // notificações também fica obsoleta.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
      ]);

      router.back();
    } catch (err) {
      Alert.alert(
        "Não foi possível salvar",
        err instanceof Error ? err.message : "Erro desconhecido.",
      );
    }
  };

  const handleDelete = () => {
    if (!campaignId) return;

    Alert.alert(
      "Excluir campanha",
      "Excluir esta campanha? Os disparos pendentes dela saem da lista.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await remove.mutateAsync({ id: campaignId });
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() }),
                queryClient.invalidateQueries({
                  queryKey: getListNotificationsQueryKey(),
                }),
              ]);
              router.back();
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

  if (!isNew && isLoading) {
    return (
      <View className="flex-1 bg-background">
        <FormHeader title="Editar campanha" />
        <View className="items-center py-12">
          <ActivityIndicator size="large" color="#F59E0B" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FormHeader title={isNew ? "Nova campanha" : "Editar campanha"} />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          label="Nome"
          required
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: Volta pro corte"
          editable={!saving}
        />

        <FormSection title="Tipo">
          <View className="flex-row flex-wrap gap-2">
            {TIPOS.map((option) => (
              <ChipOption
                key={option}
                label={CAMPAIGN_TIPO_LABEL[option]}
                selected={tipo === option}
                onPress={() => setTipo(option)}
              />
            ))}
          </View>
        </FormSection>

        <Field
          label={diasLabel(tipo)}
          required
          value={dias}
          onChangeText={setDias}
          keyboardType="number-pad"
          editable={!saving}
        />

        {Number.isInteger(diasNumero) ? (
          <Text className="-mt-3 text-xs text-muted-foreground">
            Dispara {describeCampaignTrigger(tipo, diasNumero)}.
          </Text>
        ) : null}

        {diasIgnorado ? (
          <Card>
            <View className="flex-row gap-2">
              <Info size={16} color="#EAB308" />
              <Text className="flex-1 text-xs text-muted-foreground">
                Este número está abaixo da janela de retorno da barbearia
                ({diasRetorno} dias), então{" "}
                <Text className="font-semibold text-foreground">
                  não vai antecipar o disparo
                </Text>
                . O recall é o piso: quem a barbearia ainda considera Ativo não
                recebe campanha de retorno. Para antecipar, mude a janela em
                Configurações — isso move o recall inteiro.
              </Text>
            </View>
          </Card>
        ) : null}

        <FormSection title="Mensagem">
          <Field
            label="Texto enviado"
            required
            value={mensagem}
            onChangeText={setMensagem}
            placeholder="Oi {nome}! Faz {dias} dias que você não aparece..."
            multiline
            numberOfLines={5}
            style={{ textAlignVertical: "top", minHeight: 112 }}
            editable={!saving}
          />

          <Text className="text-xs text-muted-foreground">
            Toque para inserir — o servidor substitui pelo valor real:
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {VARIAVEIS.map((variavel) => (
              <Pressable
                key={variavel.token}
                onPress={() => insertVariable(variavel.token)}
                accessibilityRole="button"
                accessibilityLabel={`Inserir ${variavel.hint}`}
                disabled={saving}
                className="rounded-md border border-border px-2 py-1 active:opacity-70"
              >
                <Text className="text-xs font-medium text-primary">
                  {variavel.token}
                </Text>
              </Pressable>
            ))}
          </View>
        </FormSection>

        {coupons && coupons.length > 0 ? (
          <FormSection title="Cupom (opcional)">
            <View className="flex-row flex-wrap gap-2">
              <ChipOption
                label="Sem cupom"
                selected={cupomId === null}
                onPress={() => setCupomId(null)}
              />
              {coupons.map((coupon) => (
                <ChipOption
                  key={coupon.id}
                  label={coupon.codigo}
                  selected={cupomId === coupon.id}
                  onPress={() => setCupomId(coupon.id)}
                />
              ))}
            </View>
            <Text className="text-xs text-muted-foreground">
              O código entra na mensagem onde estiver {"{cupom_texto}"}.
            </Text>
          </FormSection>
        ) : null}

        {formError ? (
          <Text className="text-xs text-destructive">{formError}</Text>
        ) : null}

        <Button
          label={isNew ? "Criar campanha" : "Salvar alterações"}
          onPress={handleSave}
          loading={saving}
        />

        {!isNew ? (
          <Pressable
            onPress={handleDelete}
            accessibilityRole="button"
            className="h-11 flex-row items-center justify-center gap-2 rounded-lg border border-destructive active:opacity-70"
          >
            <Trash2 size={16} color="#EF4444" />
            <Text className="text-sm font-semibold" style={{ color: "#EF4444" }}>
              Excluir campanha
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
