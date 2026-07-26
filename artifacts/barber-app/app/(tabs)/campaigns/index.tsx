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
import { useRouter } from "expo-router";
import {
  MessageSquare,
  Send,
  RefreshCw,
  CheckCircle2,
  Clock,
  Plus,
  Pencil,
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
import { Card, Avatar, EmptyState, Badge,
  INK_INVERSE,
  INK,
} from "@/components/ui";

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
          <Text className="text-base font-semibold text-ink" numberOfLines={1}>
            {nome}
          </Text>
          <Text className="text-xs text-ink-muted">
            {notification.campaignNome ?? "Campanha"}
            {notification.diasSemVisita != null
              ? ` · ${notification.diasSemVisita} dias sem visitar`
              : ""}
          </Text>
        </View>

        {enviado ? (
          <View className="items-end">
            <View className="flex-row items-center gap-1">
              <CheckCircle2 size={16} color={INK} />
              <Text className="text-xs font-medium" style={{ color: INK }}>
                Enviado
              </Text>
            </View>
            {/* Autoria só aparece quando existe: disparos anteriores à coluna
                `sent_by` não têm, e mostrar "por —" seria ruído. */}
            {notification.sentByNome ? (
              <Text className="mt-0.5 text-xs text-ink-muted">
                por {notification.sentByNome}
              </Text>
            ) : null}
          </View>
        ) : (
          <Pressable
            onPress={() => onSend(notification)}
            disabled={sending || !notification.waLink}
            accessibilityRole="button"
            accessibilityLabel={`Enviar mensagem para ${nome}`}
            className={`h-9 flex-row items-center gap-1.5 rounded-pill bg-hero px-3 active:opacity-80 ${
              sending || !notification.waLink ? "opacity-50" : ""
            }`}
          >
            <Send size={14} color={INK_INVERSE} />
            <Text className="text-xs font-semibold text-ink-inverse">
              Enviar
            </Text>
          </Pressable>
        )}
      </View>

      {notification.mensagemResolvida ? (
        <Text className="mt-2 text-xs text-ink-muted" numberOfLines={2}>
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
  onEdit,
}: {
  campaign: Campaign;
  onToggle: (campaign: Campaign) => void;
  toggling: boolean;
  onEdit: (campaign: Campaign) => void;
}) {
  return (
    <Card className="mb-2">
      <View className="flex-row items-center justify-between gap-3">
        <Pressable
          onPress={() => onEdit(campaign)}
          accessibilityRole="button"
          accessibilityLabel={`Editar ${campaign.nome}`}
          className="flex-1 active:opacity-70"
        >
          <Text className="text-base font-semibold text-ink" numberOfLines={1}>
            {campaign.nome}
          </Text>
          <Text className="text-xs text-ink-muted">
            {describeCampaignTrigger(campaign.tipo, campaign.dias)}
          </Text>
          <View className="mt-1.5 flex-row items-center gap-2">
            <Badge label={CAMPAIGN_TIPO_LABEL[campaign.tipo]} />
            {campaign.cupomCodigo ? (
              <Badge label={campaign.cupomCodigo} />
            ) : null}
          </View>
        </Pressable>

        <Pencil size={14} />

        <Switch
          value={campaign.ativo}
          onValueChange={() => onToggle(campaign)}
          disabled={toggling}
          trackColor={{ false: "#E6E6EA", true: INK }}
          thumbColor="#FFFFFF"
        />
      </View>
    </Card>
  );
}

export default function CampaignsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
    <View className="flex-1 bg-canvas" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between border-b border-hairline px-4 pb-3 pt-2">
        <Text className="text-lg font-bold text-ink">Campanhas</Text>

        <Pressable
          onPress={handleGenerate}
          disabled={generate.isPending}
          accessibilityRole="button"
          accessibilityLabel="Atualizar disparos de hoje"
          className={`h-9 flex-row items-center gap-1.5 rounded-pill border border-hairline px-3 active:opacity-70 ${
            generate.isPending ? "opacity-50" : ""
          }`}
        >
          {generate.isPending ? (
            <ActivityIndicator size="small" color={INK} />
          ) : (
            <RefreshCw size={14} />
          )}
          <Text className="text-xs font-medium text-ink">Atualizar</Text>
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
            tintColor={INK}
          />
        }
      >
        <View className="mb-2 flex-row items-center gap-2">
          <Clock size={16} color={INK} />
          <Text className="text-base font-semibold text-ink">
            Disparos de hoje
          </Text>
          {pendentes.length > 0 ? (
            <Badge label={String(pendentes.length)} strong />
          ) : null}
        </View>

        {loadingNotifications ? (
          <ActivityIndicator color={INK} />
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
            <Text className="mb-2 mt-4 text-base font-semibold text-ink">
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

        <View className="mb-2 mt-6 flex-row items-center justify-between">
          <Text className="text-base font-semibold text-ink">
            Campanhas configuradas
          </Text>

          <Pressable
            onPress={() => router.push("/campaigns/edit")}
            accessibilityRole="button"
            accessibilityLabel="Nova campanha"
            className="h-9 flex-row items-center gap-1.5 rounded-pill bg-hero px-3 active:opacity-80"
          >
            <Plus size={14} color={INK_INVERSE} />
            <Text className="text-xs font-semibold text-ink-inverse">Nova</Text>
          </Pressable>
        </View>

        {loadingCampaigns ? (
          <ActivityIndicator color={INK} />
        ) : campaigns && campaigns.length > 0 ? (
          campaigns.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              onToggle={handleToggle}
              toggling={busyId === campaign.id}
              onEdit={(item) => router.push(`/campaigns/edit?id=${item.id}`)}
            />
          ))
        ) : (
          <EmptyState
            icon={MessageSquare}
            title="Nenhuma campanha"
            description="Crie uma campanha de retorno para o sistema começar a sugerir contatos."
          />
        )}
      </ScrollView>
    </View>
  );
}
