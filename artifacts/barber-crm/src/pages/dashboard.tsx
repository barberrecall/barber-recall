import { useGetDashboardStats, useGetDashboardCharts, useGetRecentActivity, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, AlertCircle, Clock, Banknote, Ticket, CalendarDays, Activity, MessageSquare } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBRL } from "@/lib/money";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ query: { queryKey: getGetDashboardStatsQueryKey() } });
  const { data: charts, isLoading: chartsLoading } = useGetDashboardCharts();
  const { data: recentActivity, isLoading: activityLoading } = useGetRecentActivity();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">Visão geral do desempenho da sua barbearia hoje.</p>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 md:h-28 rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard title="Clientes Ativos" value={stats.clientesAtivos} icon={Users} />
          <StatCard title="Novos Hoje" value={stats.clientesNovosHoje} icon={TrendingUp} />
          <StatCard title="Aguard. Retorno" value={stats.clientesAguardandoRetorno} icon={Clock} />
          <StatCard title="Em Risco" value={stats.clientesEmRisco} icon={AlertCircle} />

          <StatCard title="Atend. Hoje" value={stats.atendimentosHoje} icon={CalendarDays} />
          <StatCard title="Faturamento" value={formatBRL(stats.faturamentoHoje)} icon={Banknote} />
          <StatCard title="Cupons Usados" value={stats.cuponsUtilizados} icon={Ticket} />
          <StatCard title="Taxa Retorno" value={`${stats.taxaRetorno}%`} icon={Activity} />
        </div>
      ) : null}

      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Receita (Últimos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <Skeleton className="h-[200px] md:h-[300px] w-full" />
            ) : charts?.receita ? (
              <div className="h-[200px] md:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.receita} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R${val}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                      itemStyle={{ color: 'hsl(var(--primary))' }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                      formatter={(value: number) => [formatBRL(value), 'Receita']}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" dot={false} activeDot={{ r: 5, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--card))', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] md:h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sem dados suficientes</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Clientes por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {chartsLoading ? (
              <Skeleton className="h-[200px] md:h-[300px] w-full" />
            ) : charts?.clientesPorDia ? (
              <div className="h-[200px] md:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.clientesPorDia} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                      itemStyle={{ color: 'hsl(var(--primary))' }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] md:h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sem dados suficientes</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="text-base md:text-lg">Atividade Recente</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 border-b border-border/50 last:border-0 pb-3 last:pb-0">
                  <div className="p-2 rounded-full flex-shrink-0 bg-muted text-foreground">
                    {activity.tipo === 'new_client' ? <Users className="h-4 w-4" /> :
                     activity.tipo === 'appointment' ? <CalendarDays className="h-4 w-4" /> :
                     <MessageSquare className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{activity.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.clienteNome && <span className="font-medium text-foreground">{activity.clienteNome} · </span>}
                      {format(new Date(activity.data), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {activity.valor && (
                    <div className="font-semibold text-sm text-foreground flex-shrink-0">
                      +{formatBRL(activity.valor)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">Nenhuma atividade recente.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string, value: string | number, icon: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 md:p-5 flex flex-col justify-between gap-2 md:gap-3 transition-colors hover:border-foreground/20">
      <div className="flex justify-between items-start">
        <p className="text-[11px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight">{title}</p>
        <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted">
          <Icon className="h-3.5 w-3.5 text-foreground" />
        </div>
      </div>
      <h3 className="text-xl md:text-2xl font-bold truncate tracking-tight">{value}</h3>
    </div>
  );
}
