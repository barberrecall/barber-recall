import { useState, useEffect, useCallback, useRef } from "react";
import { Scissors, CheckCircle2, XCircle, Lock, CreditCard, QrCode, Copy, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

// Terminal PIX states that will never become approved
const PIX_TERMINAL_FAILED = new Set(["rejected", "cancelled", "refunded", "charged_back"]);

interface PaywallOverlayProps {
  onSubscribed: () => void;
  /** If provided, shows an X button to dismiss (used when opened from banner, trial not yet expired) */
  onDismiss?: () => void;
}

const FEATURES = [
  "Clientes ilimitados",
  "Barbeiros ilimitados",
  "Campanhas automatizadas via WhatsApp",
  "Insights de IA e Relatórios",
  "Gestão de Cupons",
];

type Screen = "choose" | "pix" | "card-loading";

interface PixData {
  payment_id: number;
  qr_code: string;
  qr_code_base64: string | null;
}

/**
 * After Mercado Pago confirms payment, the webhook may still be processing.
 * Poll /api/barbershop until plan === "pro" (up to maxAttempts), then unlock.
 */
async function waitForProActivation(maxAttempts = 15, intervalMs = 2000): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      const res = await fetch(`${BASE_URL}api/barbershop`, { credentials: "include" });
      if (!res.ok) continue;
      const data = await res.json() as { plan?: string };
      if (data.plan === "pro") return true;
    } catch {
      // keep trying
    }
  }
  return false;
}

export function PaywallOverlay({ onSubscribed, onDismiss }: PaywallOverlayProps) {
  const [screen, setScreen] = useState<Screen>("choose");
  const [error, setError] = useState<string | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [loadingPix, setLoadingPix] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [pixStatus, setPixStatus] = useState<"pending" | "approved" | "failed" | "error">("pending");
  const [pixFailReason, setPixFailReason] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll Mercado Pago payment status every 4 seconds
  const startPolling = useCallback((paymentId: number) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BASE_URL}api/payment/pix-status/${paymentId}`, {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json() as { status?: string; statusDetail?: string };

        if (data.status === "approved") {
          clearInterval(pollRef.current!);
          setPixStatus("approved");
          // Webhook may be processing: poll /api/barbershop until plan flips to pro
          const activated = await waitForProActivation();
          if (activated) {
            onSubscribed();
          } else {
            // Webhook took too long but payment is real — still unlock and let parent refresh
            onSubscribed();
          }
          return;
        }

        if (data.status && PIX_TERMINAL_FAILED.has(data.status)) {
          clearInterval(pollRef.current!);
          const detail = data.statusDetail ? ` (${data.statusDetail})` : "";
          setPixFailReason(`Pagamento não aprovado${detail}. Tente novamente.`);
          setPixStatus("failed");
          return;
        }

        // "expired" from Mercado Pago means the QR Code expired (30 min window)
        if (data.status === "expired") {
          clearInterval(pollRef.current!);
          setPixFailReason("O QR Code expirou. Gere um novo para continuar.");
          setPixStatus("failed");
        }
      } catch {
        // silent — keep polling
      }
    }, 4000);
  }, [onSubscribed]);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handlePix = async () => {
    setLoadingPix(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}api/payment/create-pix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json() as PixData & { error?: string };
      if (!res.ok || !data.qr_code) throw new Error(data.error ?? "Erro ao gerar PIX.");
      setPixData(data);
      setScreen("pix");
      startPolling(data.payment_id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao gerar PIX.");
    } finally {
      setLoadingPix(false);
    }
  };

  const handleCard = async () => {
    setLoadingCard(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}api/payment/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json() as { init_point?: string; error?: string };
      if (!res.ok || !data.init_point) throw new Error(data.error ?? "Erro ao abrir checkout.");
      window.location.href = data.init_point;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
      setLoadingCard(false);
    }
  };

  const copyCode = () => {
    if (!pixData?.qr_code) return;
    navigator.clipboard.writeText(pixData.qr_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/95 backdrop-blur-sm sm:px-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35, ease: "easeOut" }}
        className="w-full sm:max-w-md bg-card border border-border sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-y-auto max-h-[92dvh]"
      >
        <AnimatePresence mode="wait">

          {/* ── Tela de escolha ── */}
          {screen === "choose" && (
            <motion.div
              key="choose"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-8 flex flex-col items-center text-center relative"
            >
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="absolute top-0 right-0 p-2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-5">
                <Lock className="h-7 w-7 text-primary" />
              </div>
              <div className="flex items-center gap-2 text-primary font-bold text-lg mb-3">
                <Scissors className="h-5 w-5" />
                <span>Barber Recall</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Seu teste grátis expirou</h2>
              <p className="text-muted-foreground mb-6 text-sm leading-relaxed">
                Assine o plano <strong className="text-foreground">Pro</strong> para continuar e não perder nenhum cliente.
              </p>

              {/* Plan card */}
              <div className="w-full border-2 border-primary rounded-2xl p-5 mb-6 text-left bg-primary/5">
                <div className="flex items-baseline justify-between mb-4">
                  <span className="font-bold text-lg">Plano Pro</span>
                  <div>
                    <span className="text-3xl font-bold">R$ 69,90</span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </div>
                </div>
                <ul className="space-y-2 text-sm">
                  {FEATURES.map((feat) => (
                    <li key={feat} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {error && (
                <p className="text-destructive text-sm mb-4 bg-destructive/10 rounded-xl px-4 py-2 w-full text-left">
                  {error}
                </p>
              )}

              <div className="w-full space-y-3">
                <Button
                  className="w-full h-[52px] rounded-full text-sm font-semibold gap-2.5"
                  onClick={handlePix}
                  disabled={loadingPix || loadingCard}
                >
                  {loadingPix
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando QR Code…</>
                    : <><QrCode className="h-5 w-5" /> Pagar com PIX — R$ 69,90/mês</>}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 rounded-full text-sm font-medium gap-2.5"
                  onClick={handleCard}
                  disabled={loadingPix || loadingCard}
                >
                  {loadingCard
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Abrindo checkout…</>
                    : <><CreditCard className="h-4 w-4" /> Cartão de crédito (recorrente)</>}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                Pagamento seguro via Mercado Pago. Cancele a qualquer momento.
              </p>
            </motion.div>
          )}

          {/* ── Tela PIX ── */}
          {screen === "pix" && (
            <motion.div
              key="pix"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="p-8 flex flex-col items-center text-center"
            >
              {/* ── Pagamento aprovado / ativando ── */}
              {pixStatus === "approved" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-4 py-8"
                >
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-foreground" />
                  </div>
                  <h3 className="text-xl font-bold">Pagamento confirmado!</h3>
                  <p className="text-muted-foreground text-sm flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Ativando seu plano Pro…
                  </p>
                </motion.div>
              )}

              {/* ── Pagamento falhou / expirou ── */}
              {pixStatus === "failed" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-4 py-8"
                >
                  <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                    <XCircle className="h-10 w-10 text-destructive" />
                  </div>
                  <h3 className="text-xl font-bold">Pagamento não concluído</h3>
                  <p className="text-muted-foreground text-sm text-center">
                    {pixFailReason ?? "Ocorreu um erro no pagamento."}
                  </p>
                  <Button
                    className="mt-2 w-full rounded-full"
                    onClick={() => {
                      setPixStatus("pending");
                      setPixFailReason(null);
                      setPixData(null);
                      setScreen("choose");
                    }}
                  >
                    Tentar novamente
                  </Button>
                </motion.div>
              )}

              {/* ── QR Code aguardando pagamento ── */}
              {pixStatus === "pending" && (
                <>
                  <div className="flex items-center gap-2 text-primary font-bold mb-1">
                    <QrCode className="h-5 w-5" />
                    <span>Pagar com PIX</span>
                  </div>
                  <p className="text-muted-foreground text-xs mb-5">
                    Escaneie o QR Code com o app do seu banco. Expira em 30 minutos.
                  </p>

                  {/* QR Code image */}
                  <div className="bg-white rounded-2xl p-4 mb-5 shadow-md">
                    {pixData?.qr_code_base64 ? (
                      <img
                        src={`data:image/png;base64,${pixData.qr_code_base64}`}
                        alt="QR Code PIX"
                        className="w-48 h-48"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Copia e cola */}
                  <p className="text-xs text-muted-foreground mb-2">Ou use o código Pix Copia e Cola:</p>
                  <div
                    className="w-full bg-muted rounded-xl px-3 py-2.5 text-[10px] text-muted-foreground font-mono break-all text-left max-h-16 overflow-y-auto mb-3 cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={copyCode}
                    title="Clique para copiar"
                  >
                    {pixData?.qr_code}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 mb-5"
                    onClick={copyCode}
                  >
                    {copied ? <><Check className="h-4 w-4 text-foreground" /> Código copiado!</> : <><Copy className="h-4 w-4" /> Copiar código</>}
                  </Button>

                  {/* Polling indicator */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Aguardando confirmação do pagamento…
                  </div>

                  <button
                    onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setScreen("choose"); }}
                    className="mt-4 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    ← Voltar e escolher outra forma de pagamento
                  </button>
                </>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
