import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Send,
  RefreshCw,
  CheckCircle2,
  Clock,
} from "lucide-react-native";
import {
  useListNotifications,
  useListCampaigns,
  useGenerateNotifications,
  useMarkNotificationSent,
  useToggleCampaign,
  getListNotificationsQueryKey,
  getListCampaignsQueryKey,
  type Notification,
  type Campaign,
} from "@workspace/api-client-react";
import { CAMPAIGN_TIPO_LABEL, describeCampaignTrigger } from "@/lib/campaign-labels";
import { Card, Avatar, EmptyState, Badge } from "@/components/ui";

/**
 * Disparo pendente.
 *
 * O botão abre o WhatsApp do próprio barbeiro com a mensagem pronta para ele
 * revisar e enviar — o sistema nunca envia sozinho. É decisão de produto
 * registrada na skill `campanhas-whatsapp`: envio em massa não solicitado
 * derruba o número, e a API oficial do WhatsApp Business cobra por mensagem.
 *
 * O `waLink` e a mensagem já vêm resolvidos do servidor (`resolveMessage`), o
 * que mantém a substituição de `{nome}`, `{barbearia}` e afins num lugar só,
 * compartilhada com o web.
 */
function PendingRow({
  notification,
  onSend,
  sending,
}: {
  notification: Notification;
  onSend: (notification: Notification) => void;
  sending: boolean;
}) {
  const nome = notification.clienteNome ?? "Cliente";
  const enviado = notification.status === "sent";

  return (
    <Card className="mb-2">
      <View className="flex-row items-center gap-3">
        <Avatar name={nome} />

        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {nome}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {notification.campaignNome ?? "Campanha"}
            {notification.diasSemVisita != null
              ? ` · ${notification.diasSemVisita} dias sem visitar`
              : ""}
          </Text>
        </View>

        {enviado ? (
          <View className="flex-row items-center gap-1">
            <CheckCircle2 size={16} color="#10B981" />
            <Text className="text-xs font-medium" style={{ color: "#10B981" }}>
              Enviado
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={() => onSend(notification)}
            disabled={sending || !notification.waLink}
            accessibilityRole="button"
            accessibilityLabel={`Enviar mensagem para ${nome}`}
            className={`h-9 flex-row items-center gap-1.5 rounded-lg bg-primary px-3 active:opacity-80 ${
              sending || !notification.waLink ? "opacity-50" : ""
            }`}
          >
            <Send size={14} color="#0A0E1A" />
            <Text className="text-xs font-semibold text-primary-foreground">
              Enviar
            </Text>
          </Pressable>
        )}
      </View>

      {notification.mensagemResolvida ? (
        <Text className="mt-2 text-xs text-muted-foreground" numberOfLines={2}>
          {notification.mensagemResolvida}
        </Text>
      ) : null}
    </Card>
  );
}

function CampaignRow({
  campaign,
  onToggle,
  toggling,
}: {
  campaign: Campaign;
  onToggle: (campaign: Campaign) => void;
  toggling: boolean;
}) {
  return (
    <Card className="mb-2">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {campaign.nome}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {describeCampaignTrigger(campaign.tipo, campaign.dias)}
          </Text>
          <View className="mt-1.5 flex-row items-center gap-2">
            <Badge label={CAMPAIGN_TIPO_LABEL[campaign.tipo]} color="#6366F1" />
            {campaign.cupomCodigo ? (
              <Badge label={campaign.cupomCodigo} color="#F97316" />
            ) : null}
          </View>
        </View>

        <Switch
          value={campaign.ativo}
          onValueChange={() => onToggle(campaign)}
          disabled={toggling}
          trackColor={{ false: "#3A4356", true: "#F59E0B" }}
          thumbColor="#FFFFFF"
        />
      </View>
    </Card>
  );
}

export default function CampaignsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<number | null>(null);

  const {
    data: notifications,
    isLoading: loadingNotifications,
    refetch: refetchNotifications,
    isRefetching,
  } = useListNotifications();

  const { data: campaigns, isLoading: loadingCampaigns } = useListCampaigns();

  const generate = useGenerateNotifications();
  const markSent = useMarkNotificationSent();
  const toggle = useToggleCampaign();

  const invalidateNotifications = () =>
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });

  const handleGenerate = async () => {
    try {
      const result = await generate.mutateAsync();
      await invalidateNotifications();

      Alert.alert(
        "Disparos atualizados",
        result.generated > 0
          ? `${result.generated} cliente(s) entraram na lista.`
          : "Nenhum cliente precisa de contato agora.",
      );
    } catch (error) {
      Alert.alert(
        "Não foi possível gerar",
        error instanceof Error ? error.message : "Erro desconhecido.",
      );
    }
  };

  const handleSend = async (notification: Notification) => {
    if (!notification.waLink) return;

    setBusyId(notification.id);

    try {
      const opened = await Linking.canOpenURL(notification.waLink);
      if (!opened) {
        Alert.alert("WhatsApp não encontrado", "Instale o WhatsApp para enviar.");
        return;
      }

      await Linking.openURL(notification.waLink);

      // Só marca depois que o WhatsApp abriu: se o link falhar, o disparo
      // continua pendente em vez de sumir da lista sem ter sido enviado.
      await markSent.mutateAsync({ id: notification.id });
      await invalidateNotifications();
    } catch (error) {
      Alert.alert(
        "Erro ao enviar",
        error instanceof Error ? error.message : "Erro desconhecido.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleToggle = async (campaign: Campaign) => {
    setBusyId(campaign.id);
    try {
      await toggle.mutateAsync({ id: campaign.id });
      await queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
    } catch (error) {
      Alert.alert(
        "Erro",
        error instanceof Error ? error.message : "Não foi possível alterar a campanha.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const pendentes = (notifications ?? []).filter((n) => n.status === "pending");
  const enviadosHoje = (notifications ?? []).filter((n) => n.status === "sent");

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between border-b border-border px-4 pb-3 pt-2">
        <Text className="text-lg font-bold text-foreground">Campanhas</Text>

        <Pressable
          onPress={handleGenerate}
          disabled={generate.isPending}
          accessibilityRole="button"
          accessibilityLabel="Atualizar disparos de hoje"
          className={`h-9 flex-row items-center gap-1.5 rounded-lg border border-border px-3 active:opacity-70 ${
            generate.isPending ? "opacity-50" : ""
          }`}
        >
          {generate.isPending ? (
            <ActivityIndicator size="small" color="#F59E0B" />
          ) : (
            <RefreshCw size={14} color="#8A94A6" />
          )}
          <Text className="text-xs font-medium text-foreground">Atualizar</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchNotifications}
            tintColor="#F59E0B"
          />
        }
      >
        <View className="mb-2 flex-row items-center gap-2">
          <Clock size={16} color="#F59E0B" />
          <Text className="text-base font-semibold text-foreground">
            Disparos de hoje
          </Text>
          {pendentes.length > 0 ? (
            <Badge label={String(pendentes.length)} color="#F59E0B" />
          ) : null}
        </View>

        {loadingNotifications ? (
          <ActivityIndicator color="#F59E0B" />
        ) : pendentes.length > 0 ? (
          pendentes.map((notification) => (
            <PendingRow
              key={notification.id}
              notification={notification}
              onSend={handleSend}
              sending={busyId === notification.id}
            />
          ))
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="Nenhum disparo pendente"
            description="Toque em Atualizar para verificar quem precisa de contato."
          />
        )}

        {enviadosHoje.length > 0 ? (
          <>
            <Text className="mb-2 mt-4 text-base font-semibold text-foreground">
              Já enviados
            </Text>
            {enviadosHoje.map((notification) => (
              <PendingRow
                key={notification.id}
                notification={notification}
                onSend={handleSend}
                sending={false}
              />
            ))}
          </>
        ) : null}

        <Text className="mb-2 mt-6 text-base font-semibold text-foreground">
          Campanhas configuradas
        </Text>

        {loadingCampaigns ? (
          <ActivityIndicator color="#F59E0B" />
        ) : campaigns && campaigns.length > 0 ? (
          campaigns.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              onToggle={handleToggle}
              toggling={busyId === campaign.id}
            />
          ))
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="Nenhuma campanha"
            description="As campanhas são criadas no CRM web por enquanto."
          />
        )}
      </ScrollView>
    </View>
  );
}
