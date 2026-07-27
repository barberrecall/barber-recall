import { View, Text, Platform, Linking, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Lock, LogOut } from "lucide-react-native";
import { useGetBarbershop } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { Pill, INK, INK_MUTED } from "@/components/ui";
import { webBaseUrl } from "@/lib/env";

/**
 * Bloqueia o app quando o acesso expirou.
 *
 * Espelha a regra do CRM web (`components/layout/app-layout.tsx`): bloqueia
 * quando `trialExpired`, que o servidor calcula em `computeTrialStatus`. O app
 * não recalcula nada — se recalculasse, web e app poderiam discordar sobre quem
 * está em dia.
 *
 * ── Por que a mensagem muda por plataforma ──────────────────────────────────
 *
 * A assinatura é vendida no CRM web, nunca aqui (Mercado Pago, com PIX). A
 * diretriz 3.1.3(b) da Apple permite o app ser usado por quem já assinou em
 * outro lugar, mas proíbe qualquer botão, link ou chamada para um meio de
 * compra externo. Então no iOS a tela informa que o acesso expirou e não diz
 * mais nada — sem link, sem a palavra pagamento.
 *
 * No Android e no APK direto essa restrição não existe, e esconder o caminho
 * apenas prejudicaria o barbeiro. Lá o botão para renovar aparece.
 *
 * Se algum dia a assinatura passar a ser vendida via In-App Purchase, é aqui
 * que o fluxo entra — e a diferença por plataforma deixa de ser necessária.
 */

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { data: shop, isLoading, isError } = useGetBarbershop();

  // Enquanto carrega, mostra o app. Bloquear antes de saber puniria quem está
  // em dia por causa de uma rede lenta.
  if (isLoading || isError || !shop) return <>{children}</>;

  if (!shop.trialExpired) return <>{children}</>;

  return (
    <View
      className="flex-1 items-center justify-center bg-canvas px-8"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-hero">
        <Lock size={26} color="#FFFFFF" />
      </View>

      <Text className="mt-6 text-center text-2xl font-extrabold text-ink">
        Acesso expirado
      </Text>

      <Text className="mt-2 text-center text-base text-ink-muted">
        {Platform.OS === "ios"
          ? "Sua assinatura do Barber Recall não está ativa. Reative para voltar a usar o app."
          : "Sua assinatura do Barber Recall não está ativa. Renove para voltar a usar o app."}
      </Text>

      <View className="mt-8 w-full gap-3">
        {Platform.OS !== "ios" ? (
          <Pill
            label="Renovar assinatura"
            tone="ink"
            full
            onPress={() => void Linking.openURL(webBaseUrl())}
          />
        ) : null}

        <Pressable
          onPress={() => void logout()}
          accessibilityRole="button"
          className="h-12 flex-row items-center justify-center gap-2 rounded-pill active:opacity-60"
        >
          <LogOut size={16} color={INK_MUTED} />
          <Text className="text-base font-semibold text-ink-muted">Sair</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Aviso discreto de trial, para o barbeiro não ser surpreendido pelo bloqueio. */
export function TrialBanner() {
  const { data: shop } = useGetBarbershop();

  if (!shop || shop.plan !== "free" || shop.trialExpired) return null;
  if (shop.daysRemaining == null) return null;

  return (
    <View className="mx-5 mb-3 flex-row items-center gap-2 rounded-pill bg-hero px-4 py-2.5">
      <Text className="flex-1 text-sm font-semibold text-ink-inverse">
        {shop.daysRemaining === 0
          ? "Seu teste termina hoje"
          : `${shop.daysRemaining} ${shop.daysRemaining === 1 ? "dia" : "dias"} de teste restantes`}
      </Text>
    </View>
  );
}
