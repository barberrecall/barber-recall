import { useLocation } from "wouter";
import { Clock, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function PaymentPendingPage() {
  const [, setLocation] = useLocation();

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

        <div className="h-20 w-20 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-6">
          <Clock className="h-10 w-10 text-amber-500" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Pagamento em processamento</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Seu pagamento está sendo processado pelo Mercado Pago. Assim que for confirmado, seu plano <strong className="text-foreground">Pro</strong> será ativado automaticamente.
        </p>
        <p className="text-sm text-muted-foreground bg-muted rounded-xl p-4 mb-6">
          Se pagou com boleto, pode levar até 2 dias úteis para compensar.
        </p>

        <Button className="w-full h-12 rounded-full" onClick={() => setLocation("/dashboard")}>
          Voltar ao Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
