import type { barbershopTable } from "@workspace/db";

/**
 * Estado da assinatura de uma barbearia.
 *
 * Vive aqui, e não dentro de `routes/barbershop.ts`, porque duas coisas
 * dependem dele: a rota que informa o estado ao cliente e o middleware que
 * barra o acesso quando ele expira. Com duas cópias do cálculo, uma tela
 * poderia dizer "faltam 2 dias" enquanto o servidor já recusava as requisições
 * — e o barbeiro não teria como entender o que aconteceu.
 */

export const TRIAL_DAYS = 3;

export type TrialStatus = {
  plan: "free" | "pro";
  trialActive: boolean;
  trialExpired: boolean;
  daysRemaining: number | null;
  planExpiresAt: string | null;
};

export function computeTrialStatus(
  shop: typeof barbershopTable.$inferSelect,
): TrialStatus {
  const plan = shop.plan as "free" | "pro";

  if (plan === "pro") {
    // Check if the paid plan has expired
    if (shop.planExpiresAt) {
      const expired = new Date(shop.planExpiresAt) < new Date();
      if (expired) {
        // Plan expired — treat as free/trial expired
        return {
          plan: "free" as const,
          trialActive: false,
          trialExpired: true,
          daysRemaining: null,
          planExpiresAt: shop.planExpiresAt.toISOString(),
        };
      }
      const msLeft = new Date(shop.planExpiresAt).getTime() - Date.now();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      return {
        plan,
        trialActive: false,
        trialExpired: false,
        daysRemaining: daysLeft,
        planExpiresAt: shop.planExpiresAt.toISOString(),
      };
    }
    // Pro with no expiry = legacy/card-recurring subscriber
    return {
      plan,
      trialActive: false,
      trialExpired: false,
      daysRemaining: null,
      planExpiresAt: null,
    };
  }

  // Free plan — evaluate trial window
  const msElapsed = Date.now() - new Date(shop.trialStartsAt).getTime();
  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
  const daysRemaining = Math.max(0, Math.ceil(TRIAL_DAYS - daysElapsed));
  const trialExpired = daysElapsed >= TRIAL_DAYS;
  return {
    plan,
    trialActive: !trialExpired,
    trialExpired,
    daysRemaining,
    planExpiresAt: null,
  };
}
