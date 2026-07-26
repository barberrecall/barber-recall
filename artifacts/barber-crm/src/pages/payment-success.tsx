import { useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function PaymentSuccessPage() {
  const [, setLocation] = useLocation();

  // Auto-redirect after 5 seconds
  useEffect(() => {
    const t = setTimeout(() => setLocation("/dashboard"), 5000);
    return () => clearTimeout(t);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-sm w-full"
      >
        <div className="flex items-center justify-center gap-2 text-primary font-bold text-xl mb-8">
          <Scissors className="h-6 w-6" />
          <span>Barber Recall</span>
        </div>

        <div className="h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Pagamento confirmado!</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Sua assinatura do <strong className="text-foreground">Plano Pro</strong> está ativa. Bem-vindo ao Barber Recall!
        </p>

        <Button className="w-full h-12 rounded-full" onClick={() => setLocation("/dashboard")}>
          Ir para o Dashboard
        </Button>

        <p className="text-xs text-muted-foreground mt-4">
          Redirecionando automaticamente em 5 segundos…
        </p>
      </motion.div>
    </div>
  );
}
