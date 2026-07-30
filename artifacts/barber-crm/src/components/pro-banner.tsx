import { Crown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProBannerProps {
  planExpiresAt: string;
  daysRemaining: number;
  onRenew: () => void;
}

export function ProBanner({ planExpiresAt, daysRemaining, onRenew }: ProBannerProps) {
  const expiresSoon = daysRemaining <= 7;
  const urgent = daysRemaining <= 2;

  if (!expiresSoon) {
    // Subtle indicator — just shows expiry date, no CTA
    return (
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b text-xs font-medium bg-primary/5 border-primary/10 text-primary">
        <div className="flex items-center gap-1.5">
          <Crown className="h-3.5 w-3.5" />
          <span>Plano Pro ativo</span>
          <span className="text-muted-foreground font-normal">
            · expira em {new Date(planExpiresAt).toLocaleDateString("pt-BR")}
          </span>
        </div>
      </div>
    );
  }

  const bgClass = urgent
    ? "bg-destructive/10 border-destructive/20 text-destructive"
    : "bg-muted-foreground/10 border-muted-foreground/20 text-foreground";

  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 border-b text-xs font-medium ${bgClass}`}>
      <div className="flex items-center gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
        <span>
          {urgent
            ? `Seu plano Pro expira ${daysRemaining <= 0 ? "hoje" : `em ${daysRemaining} dia${daysRemaining !== 1 ? "s" : ""}`}!`
            : `Plano Pro expira em ${daysRemaining} dias — renove para não perder acesso.`}
        </span>
      </div>
      <Button
        size="sm"
        className="flex-shrink-0 h-7 text-xs rounded-full px-3 gap-1"
        onClick={onRenew}
      >
        <Crown className="h-3 w-3" />
        Renovar
      </Button>
    </div>
  );
}
