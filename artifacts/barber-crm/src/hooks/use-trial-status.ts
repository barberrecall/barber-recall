import { useCallback, useEffect, useState } from "react";

export interface TrialStatus {
  plan: "free" | "pro";
  trialActive: boolean;
  trialExpired: boolean;
  /** days left in trial (free plan) or days left in Pro subscription */
  daysRemaining: number | null;
  /** ISO string — used for live countdown; null when plan is 'pro' */
  trialStartsAt: string | null;
  /** ISO string — when the Pro plan expires; null for free or legacy card plan */
  planExpiresAt: string | null;
  loading: boolean;
  error: boolean;
}

const BASE_URL = import.meta.env.BASE_URL ?? "/";

const DEFAULT: TrialStatus = {
  plan: "free",
  trialActive: true,
  trialExpired: false,
  daysRemaining: 3,
  trialStartsAt: null,
  planExpiresAt: null,
  loading: true,
  error: false,
};

export function useTrialStatus(): TrialStatus & { refresh: () => void } {
  const [status, setStatus] = useState<TrialStatus>(DEFAULT);

  const fetchStatus = useCallback(async () => {
    setStatus((s) => ({ ...s, loading: true, error: false }));
    try {
      const res = await fetch(`${BASE_URL}api/barbershop`, { credentials: "include" });
      if (!res.ok) {
        setStatus((s) => ({ ...s, loading: false, error: true }));
        return;
      }
      const data = await res.json();
      const plan: "free" | "pro" = data.plan === "pro" ? "pro" : "free";
      setStatus({
        plan,
        trialActive: Boolean(data.trialActive),
        trialExpired: Boolean(data.trialExpired),
        daysRemaining: typeof data.daysRemaining === "number" ? data.daysRemaining : null,
        trialStartsAt: typeof data.trialStartsAt === "string" ? data.trialStartsAt : null,
        planExpiresAt: typeof data.planExpiresAt === "string" ? data.planExpiresAt : null,
        loading: false,
        error: false,
      });
    } catch {
      setStatus((s) => ({ ...s, loading: false, error: true }));
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { ...status, refresh: fetchStatus };
}
