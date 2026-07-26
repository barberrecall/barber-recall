import { useLocation } from "wouter";
import { XCircle, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function PaymentFailurePage() {
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

        <div className="h-20 w-20 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-6">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold mb-2">Pagamento não concluído</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Houve um problema com o pagamento. Tente novamente ou use outro método de pagamento.
        </p>

        <Button className="w-full h-12 rounded-full mb-3" onClick={() => setLocation("/dashboard")}>
          Tentar novamente
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setLocation("/dashboard")}>
          Voltar ao Dashboard
        </Button>
      </motion.div>
    </div>
  );
}
