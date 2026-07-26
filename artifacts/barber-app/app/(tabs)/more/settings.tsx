import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react-native";
import {
  useGetBarbershop,
  useUpdateBarbershop,
  getGetBarbershopQueryKey,
  getListClientsQueryKey,
  getGetDashboardStatsQueryKey,
} from "@workspace/api-client-react";
import { Field, FormHeader } from "@/components/form";
import { Button, Card } from "@/components/ui";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: shop, isLoading } = useGetBarbershop();
  const update = useUpdateBarbershop();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [cidade, setCidade] = useState("");
  const [diasRetorno, setDiasRetorno] = useState("30");
  const [mensagemPadrao, setMensagemPadrao] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Preenche uma vez, quando os dados chegam. Sincronizar a cada render
  // sobrescreveria o que o usuário está digitando.
  useEffect(() => {
    if (!shop) return;
    setNome(shop.nome);
    setTelefone(shop.telefone);
    setWhatsapp(shop.whatsapp ?? "");
    setInstagram(shop.instagram ?? "");
    setCidade(shop.cidade);
    setDiasRetorno(String(shop.diasRetorno ?? 30));
    setMensagemPadrao(shop.mensagemPadrao ?? "");
  }, [shop]);

  const handleSave = async () => {
    const dias = Number.parseInt(diasRetorno, 10);

    if (!nome.trim()) {
      setError("Informe o nome da barbearia.");
      return;
    }

    if (!Number.isInteger(dias) || dias < 1) {
      setError("A janela de retorno deve ser um número de dias maior que zero.");
      return;
    }

    setError(null);

    try {
      await update.mutateAsync({
        data: {
          nome: nome.trim(),
          telefone: telefone.trim(),
          cidade: cidade.trim(),
          whatsapp: whatsapp.trim(),
          instagram: instagram.trim(),
          mensagemPadrao: mensagemPadrao.trim(),
          diasRetorno: dias,
        },
      });

      // `diasRetorno` é a base do cálculo de recall: mudá-lo reclassifica todo
      // mundo, então dashboard e lista de clientes ficam obsoletos junto.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetBarbershopQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() }),
      ]);

      Alert.alert("Salvo", "As configurações foram atualizadas.");
    } catch (err) {
      Alert.alert(
        "Não foi possível salvar",
        err instanceof Error ? err.message : "Erro desconhecido.",
      );
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background">
        <FormHeader title="Configurações" />
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
      <FormHeader title="Configurações" />

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          label="Nome da barbearia"
          required
          value={nome}
          onChangeText={setNome}
          editable={!update.isPending}
        />

        <Field
          label="Cidade"
          value={cidade}
          onChangeText={setCidade}
          editable={!update.isPending}
        />

        <Field
          label="Telefone"
          value={telefone}
          onChangeText={setTelefone}
          keyboardType="phone-pad"
          editable={!update.isPending}
        />

        <Field
          label="WhatsApp"
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
          editable={!update.isPending}
        />

        <Field
          label="Instagram"
          value={instagram}
          onChangeText={setInstagram}
          placeholder="@suabarbearia"
          autoCapitalize="none"
          editable={!update.isPending}
        />

        <Field
          label="Janela de retorno (dias)"
          required
          value={diasRetorno}
          onChangeText={setDiasRetorno}
          keyboardType="number-pad"
          editable={!update.isPending}
        />

        <Card>
          <View className="flex-row gap-2">
            <Info size={16} color="#F59E0B" />
            <Text className="flex-1 text-xs text-muted-foreground">
              A janela de retorno define quando um cliente deixa de ser{" "}
              <Text className="font-semibold text-foreground">Ativo</Text>. Depois
              dela ele passa a{" "}
              <Text className="font-semibold text-foreground">Aguardando Retorno</Text>{" "}
              e, sete dias mais tarde, a{" "}
              <Text className="font-semibold text-foreground">Em Risco</Text>.
              {"\n\n"}
              Mudar esse número reclassifica todos os clientes de uma vez e é o
              único jeito de antecipar os disparos — baixar o prazo de uma
              campanha isolada não faz ela disparar mais cedo.
            </Text>
          </View>
        </Card>

        <Field
          label="Mensagem padrão"
          value={mensagemPadrao}
          onChangeText={setMensagemPadrao}
          placeholder="Usada como base nas campanhas"
          multiline
          numberOfLines={4}
          style={{ textAlignVertical: "top", minHeight: 96 }}
          editable={!update.isPending}
        />

        {error ? <Text className="text-xs text-destructive">{error}</Text> : null}

        <Button
          label="Salvar configurações"
          onPress={handleSave}
          loading={update.isPending}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
