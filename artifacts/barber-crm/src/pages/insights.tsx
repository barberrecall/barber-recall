import { useGetInsights } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowUpRight, TrendingUp, CheckCircle2, Info, Banknote, Users, Sparkles, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function InsightsPage() {
  const { data, isLoading } = useGetInsights();

  // Sem cor de acento: o tipo do insight se distingue pela forma do ícone e
  // pelo texto, não por matiz — mesma regra do resto do redesign.
  const getInsightIcon = (tipo: string) => {
    switch (tipo) {
      case 'warning': return <AlertCircle className="h-5 w-5 text-foreground" />;
      case 'opportunity': return <TrendingUp className="h-5 w-5 text-foreground" />;
      case 'success': return <CheckCircle2 className="h-5 w-5 text-foreground" />;
      case 'info': return <Info className="h-5 w-5 text-foreground" />;
      default: return <Sparkles className="h-5 w-5 text-foreground" />;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 md:space-y-8 w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          Insights IA <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-primary" />
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm">Análise inteligente para maximizar seus lucros.</p>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : data ? (
        <>
          {/* Hero metrics */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            {/* Potential revenue card */}
            <Card className="bg-gradient-to-br from-card to-card border-primary/30 shadow-lg shadow-primary/5 overflow-hidden relative">
              <div className="absolute right-0 top-0 w-28 h-28 bg-primary/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <CardContent className="p-5 md:p-8">
                <div className="flex items-center gap-2 mb-3 text-primary font-medium text-sm">
                  <Banknote className="h-4 w-4" />
                  Receita Potencial a Recuperar
                </div>
                <div className="text-3xl md:text-5xl font-bold text-foreground mb-2">
                  R$ {data.potentialRevenue.toFixed(2)}
                </div>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Valor estimado se {data.clientesEmRisco} clientes em risco retornarem.
                </p>
                <Button className="mt-5 shadow-md w-full sm:w-auto" asChild>
                  <Link href="/campaigns">Ativar Campanhas</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Stats column */}
            <div className="grid grid-cols-2 md:grid-rows-2 md:grid-cols-1 gap-3 md:gap-4">
              <Card>
                <CardContent className="p-4 md:p-6 flex items-center gap-3 h-full">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-muted flex items-center justify-center text-foreground flex-shrink-0">
                    <Users className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground">Clientes em Risco</p>
                    <p className="text-2xl md:text-3xl font-bold">{data.clientesEmRisco}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 md:p-6 flex items-center gap-3 h-full">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-muted flex items-center justify-center text-foreground flex-shrink-0">
                    <Clock className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">Melhor Horário</p>
                    <p className="text-base md:text-xl font-bold">{data.melhorDiaCampanha}</p>
                    <p className="text-xs text-muted-foreground">{data.melhorHorario}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recommendations */}
          <div className="space-y-3">
            <h2 className="text-lg md:text-xl font-bold">Recomendações Diretas</h2>
            <div className="grid gap-3">
              {data.insights.map((insight) => (
                <Card key={insight.id} className="border border-border">
                  <CardContent className="p-4 md:p-5 flex gap-3 items-start">
                    <div className="mt-0.5 flex-shrink-0">
                      {getInsightIcon(insight.tipo)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-relaxed text-sm md:text-base">{insight.mensagem}</p>
                      {insight.impacto && insight.impacto > 0 ? (
                        <div className="flex items-center gap-1 text-sm font-medium text-foreground mt-1.5">
                          <ArrowUpRight className="h-4 w-4" />
                          +R$ {insight.impacto.toFixed(2)} estimado
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
