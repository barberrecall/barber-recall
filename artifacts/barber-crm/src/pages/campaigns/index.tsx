import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import {
  useListCampaigns,
  getListCampaignsQueryKey,
  useToggleCampaign,
  useDeleteCampaign,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  MessageSquare,
  Plus,
  Trash2,
  CalendarClock,
  Gift,
  Zap,
  Smartphone,
  Send,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Clock,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

interface PendingDispatch {
  id: number;
  clienteNome: string | null;
  clienteTelefone: string | null;
  diasSemVisita: number | null;
  campaignNome: string | null;
  mensagemResolvida: string | null;
  waLink: string | null;
  status: string;
}

// ─── Dispatch card ─────────────────────────────────────────────────────────

function DispatchCard({
  dispatch,
  onSent,
}: {
  dispatch: PendingDispatch;
  onSent: (id: number) => void;
}) {
  const [marking, setMarking] = useState(false);
  const [done, setDone] = useState(dispatch.status === "sent");

  const handleWhatsApp = async () => {
    if (dispatch.waLink) {
      window.open(dispatch.waLink, "_blank");
    }
    // Auto-mark as sent after opening WhatsApp
    if (!done) {
      setMarking(true);
      try {
        const res = await fetch(`${BASE_URL}api/notifications/${dispatch.id}/sent`, {
          method: "PATCH",
          credentials: "include",
        });
        if (res.ok) {
          setDone(true);
          onSent(dispatch.id);
        }
      } catch {
        // silent — user can still retry
      } finally {
        setMarking(false);
      }
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-xl border transition-all",
        done
          ? "bg-muted/30 border-border/40 opacity-60"
          : "bg-card border-border hover:border-primary/30"
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
        {dispatch.clienteNome?.[0]?.toUpperCase() ?? "?"}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-sm truncate">
            {dispatch.clienteNome ?? "Cliente"}
          </span>
          {dispatch.diasSemVisita !== null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {dispatch.diasSemVisita}d sem visitar
            </span>
          )}
          {dispatch.campaignNome && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {dispatch.campaignNome}
            </Badge>
          )}
        </div>
        {dispatch.mensagemResolvida && (
          <p className="text-xs text-muted-foreground line-clamp-2 font-mono bg-secondary/40 rounded-lg px-2 py-1.5 mt-1">
            {dispatch.mensagemResolvida}
          </p>
        )}
      </div>

      {/* Action */}
      <div className="flex-shrink-0 self-center">
        {done ? (
          <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Enviado
          </div>
        ) : (
          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs whitespace-nowrap"
            onClick={handleWhatsApp}
            disabled={marking || !dispatch.waLink}
          >
            {marking ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" />
            )}
            Abrir WhatsApp
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const { data: campaigns, isLoading } = useListCampaigns();
  const toggleCampaign = useToggleCampaign();
  const deleteCampaign = useDeleteCampaign();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dispatches, setDispatches] = useState<PendingDispatch[]>([]);
  const [loadingDispatches, setLoadingDispatches] = useState(true);
  const [generatingCount, setGeneratingCount] = useState<number | null>(null);

  // Generate + fetch pending dispatches
  const loadDispatches = useCallback(async (showToast = false) => {
    setLoadingDispatches(true);
    try {
      // Generate new ones for today
      const genRes = await fetch(`${BASE_URL}api/notifications/generate`, {
        method: "POST",
        credentials: "include",
      });
      if (genRes.ok) {
        const { generated } = (await genRes.json()) as { generated: number };
        if (generated > 0) setGeneratingCount(generated);
      }

      // Fetch all pending
      const res = await fetch(`${BASE_URL}api/notifications?status=pending`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as PendingDispatch[];
        setDispatches(data);
        if (showToast) {
          toast({ title: "Disparos atualizados", description: `${data.length} pendente(s) encontrado(s).` });
        }
      }
    } catch {
      // silent
    } finally {
      setLoadingDispatches(false);
    }
  }, [toast]);

  useEffect(() => {
    loadDispatches();
  }, [loadDispatches]);

  const handleSent = (id: number) => {
    setDispatches((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "sent" } : d))
    );
  };

  const handleToggle = (id: number) => {
    toggleCampaign.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta campanha? Ela deixará de enviar mensagens.")) {
      deleteCampaign.mutate(
        { id },
        {
          onSuccess: () => {
            toast({ title: "Campanha excluída" });
            queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
          },
        }
      );
    }
  };

  // Tipos de campanha se distinguem pelo ícone e pelo rótulo, não por matiz.
  const getTypeInfo = (tipo: string) => {
    switch (tipo) {
      case "return":
        return { icon: CalendarClock, label: "Retorno", color: "text-foreground", bg: "bg-muted" };
      case "birthday":
        return { icon: Gift, label: "Aniversário", color: "text-foreground", bg: "bg-muted" };
      case "loyalty":
        return { icon: Zap, label: "Fidelidade", color: "text-foreground", bg: "bg-muted" };
      default:
        return { icon: MessageSquare, label: "Customizada", color: "text-foreground", bg: "bg-muted" };
    }
  };

  const pendingDispatches = dispatches.filter((d) => d.status === "pending");
  const sentDispatches = dispatches.filter((d) => d.status === "sent");

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 w-full">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Campanhas Automáticas</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Configure mensagens e envie via WhatsApp com um clique.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            Nova Campanha
          </Link>
        </Button>
      </div>

      {/* ── Disparos pendentes ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
              <Send className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-base leading-tight">Disparos de hoje</h2>
              <p className="text-xs text-muted-foreground">Clientes que precisam de contato agora</p>
            </div>
            {pendingDispatches.length > 0 && (
              <Badge className="bg-foreground text-background text-xs ml-1 border-transparent">
                {pendingDispatches.length}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => loadDispatches(true)}
            disabled={loadingDispatches}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loadingDispatches && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {generatingCount !== null && generatingCount > 0 && (
          <div className="mb-3 text-xs text-foreground bg-muted rounded-lg px-3 py-2 border border-border">
            ✓ {generatingCount} novo{generatingCount > 1 ? "s disparo(s)" : " disparo"} gerado{generatingCount > 1 ? "s" : ""} hoje
          </div>
        )}

        <div className="border border-border/60 rounded-xl bg-card/50 overflow-hidden">
          {loadingDispatches ? (
            <div className="p-4 space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : pendingDispatches.length === 0 ? (
            <div className="py-10 flex flex-col items-center text-center px-4">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground opacity-30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum disparo pendente</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                {campaigns?.length === 0
                  ? "Crie uma campanha abaixo para começar a reativar clientes."
                  : "Todos os clientes das campanhas ativas já foram contactados ou não atingiram o gatilho."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {pendingDispatches.map((d) => (
                <div key={d.id} className="p-3">
                  <DispatchCard dispatch={d} onSent={handleSent} />
                </div>
              ))}
            </div>
          )}

          {/* Enviados hoje (colapsado) */}
          {sentDispatches.length > 0 && (
            <div className="border-t border-border/40 px-4 py-2.5 bg-muted/20">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />
                {sentDispatches.length} enviado{sentDispatches.length > 1 ? "s" : ""} hoje
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Campanhas configuradas ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-base leading-tight">Campanhas configuradas</h2>
            <p className="text-xs text-muted-foreground">Gatilhos automáticos de envio</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : campaigns?.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h2 className="text-xl font-bold mb-2">Nenhuma campanha configurada</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm px-4">
              Crie sua primeira campanha para reengajar clientes inativos via WhatsApp.
            </p>
            <Button asChild>
              <Link href="/campaigns/new">Criar Primeira Campanha</Link>
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns?.map((campaign) => {
              const typeInfo = getTypeInfo(campaign.tipo);
              const Icon = typeInfo.icon;

              return (
                <Card
                  key={campaign.id}
                  className={cn(
                    "flex flex-col border border-border transition-colors duration-200",
                    !campaign.ativo
                      ? "opacity-75 grayscale-[0.3]"
                      : "hover:border-foreground/30"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className={`p-2 rounded-lg ${typeInfo.bg} ${typeInfo.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant={campaign.ativo ? "default" : "secondary"}>
                        {campaign.ativo ? "Ativa" : "Pausada"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-tight">{campaign.nome}</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-1 text-xs">
                      <span className="font-medium text-foreground">{typeInfo.label}</span>
                      <span>•</span>
                      <span>
                        {campaign.tipo === "loyalty"
                          ? `A cada ${campaign.dias} visitas`
                          : `Gatilho: ${campaign.dias} dias`}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="bg-secondary/40 p-3 rounded-lg border border-border/50 text-xs relative">
                      <p className="line-clamp-4 text-muted-foreground whitespace-pre-wrap font-mono">
                        {campaign.mensagem}
                      </p>
                      {campaign.cupomCodigo && (
                        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                          <span className="text-muted-foreground">Cupom:</span>
                          <Badge
                            variant="outline"
                            className="font-mono text-primary bg-primary/5 border-primary/20"
                          >
                            {campaign.cupomCodigo}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 flex justify-between items-center border-t border-border/40 px-5 py-3 mt-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={campaign.ativo}
                        onCheckedChange={() => handleToggle(campaign.id)}
                      />
                      <span className="text-sm font-medium">
                        {campaign.ativo ? "Ligado" : "Desligado"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-muted-foreground mr-1">
                        <span className="font-bold text-foreground">
                          {campaign.notificacoesEnviadas || 0}
                        </span>{" "}
                        envios
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 h-8 w-8"
                        onClick={() => handleDelete(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
