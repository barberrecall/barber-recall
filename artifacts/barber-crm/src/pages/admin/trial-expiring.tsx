import { useEffect, useState } from "react";
import { Bell, CheckCircle2, MessageCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

interface TrialExpiringClient {
  barbershopId: number;
  nomeBarbearia: string;
  nomeDono: string | null;
  userEmail: string | null;
  whatsapp: string | null;
  daysRemaining: number;
  trialNotifiedAt: string | null;
  waLink: string | null;
  message: string;
}

function UrgencyBadge({ days }: { days: number }) {
  if (days === 0) {
    return (
      <Badge className="bg-red-500/15 text-red-600 border-red-500/30 gap-1">
        <AlertTriangle className="h-3 w-3" /> Expira hoje
      </Badge>
    );
  }
  if (days === 1) {
    return (
      <Badge className="bg-orange-500/15 text-orange-600 border-orange-500/30 gap-1">
        <Clock className="h-3 w-3" /> 1 dia restante
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-500/30 gap-1">
      <Clock className="h-3 w-3" /> {days} dias restantes
    </Badge>
  );
}

export default function TrialExpiring() {
  const [clients, setClients] = useState<TrialExpiringClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchClients = () => {
    setLoading(true);
    fetch(`${BASE_URL}api/admin/trial-expiring`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setClients(d))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleNotify = async (client: TrialExpiringClient) => {
    // Open WhatsApp first so the admin can send the message
    if (client.waLink) {
      window.open(client.waLink, "_blank", "noopener,noreferrer");
    }

    // Mark as notified in the database
    setNotifying(client.barbershopId);
    try {
      const res = await fetch(
        `${BASE_URL}api/admin/trial-expiring/${client.barbershopId}/notify`,
        { method: "POST", credentials: "include" }
      );
      if (!res.ok) throw new Error();
      toast({ title: "Marcado como notificado." });
      fetchClients();
    } catch {
      toast({ title: "Erro ao registrar notificação.", variant: "destructive" });
    } finally {
      setNotifying(null);
    }
  };

  const pendingCount = clients.filter((c) => !c.trialNotifiedAt).length;
  const notifiedCount = clients.filter((c) => c.trialNotifiedAt).length;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-orange-500" />
          Trial expirando
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Clientes com trial expirando em até 2 dias. Clique em "Notificar" para abrir o WhatsApp e marcar como contatado.
        </p>
      </div>

      {/* Summary pills */}
      {!loading && clients.length > 0 && (
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-600 border border-orange-500/25 rounded-lg px-3 py-1.5 text-sm font-medium">
            <Bell className="h-3.5 w-3.5" />
            {pendingCount} pendente{pendingCount !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-1.5 bg-green-500/10 text-green-600 border border-green-500/25 rounded-lg px-3 py-1.5 text-sm font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {notifiedCount} notificado{notifiedCount !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500/60" />
          <p className="font-medium">Nenhum trial expirando nos próximos 2 dias.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => {
            const alreadyNotified = !!client.trialNotifiedAt;
            return (
              <div
                key={client.barbershopId}
                className={cn(
                  "bg-card border rounded-xl p-4 transition-colors",
                  alreadyNotified ? "opacity-60 border-border" : "border-orange-500/30"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">{client.nomeBarbearia}</span>
                      <UrgencyBadge days={client.daysRemaining} />
                      {alreadyNotified && (
                        <Badge className="bg-green-500/15 text-green-600 border-green-500/30 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Notificado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {client.nomeDono && <span>{client.nomeDono} · </span>}
                      {client.userEmail}
                    </p>
                    {client.whatsapp && (
                      <p className="text-xs text-muted-foreground mt-0.5">📱 {client.whatsapp}</p>
                    )}
                    {alreadyNotified && client.trialNotifiedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Notificado em{" "}
                        {new Date(client.trialNotifiedAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    {!client.waLink && (
                      <p className="text-xs text-orange-600 mt-0.5">⚠️ Sem WhatsApp cadastrado</p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    {client.waLink && !alreadyNotified && (
                      <Button
                        size="sm"
                        className="text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                        disabled={notifying === client.barbershopId}
                        onClick={() => handleNotify(client)}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {notifying === client.barbershopId ? "Enviando..." : "Notificar"}
                      </Button>
                    )}
                    {client.waLink && alreadyNotified && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5"
                        onClick={() => window.open(client.waLink!, "_blank", "noopener,noreferrer")}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Reenviar
                      </Button>
                    )}
                    {!client.waLink && alreadyNotified === false && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5 text-muted-foreground"
                        disabled={notifying === client.barbershopId}
                        onClick={() => handleNotify(client)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {notifying === client.barbershopId ? "Salvando..." : "Marcar notificado"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
