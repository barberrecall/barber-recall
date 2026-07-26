import { useGetDashboardStats, useGetDashboardCharts, useGetRecentActivity, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, TrendingUp, AlertCircle, Clock, Banknote, Ticket, CalendarDays, Activity, MessageSquare } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

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
          <StatCard title="Clientes Ativos" value={stats.clientesAtivos} icon={Users} color="text-blue-500" />
          <StatCard title="Novos Hoje" value={stats.clientesNovosHoje} icon={TrendingUp} color="text-green-500" />
          <StatCard title="Aguard. Retorno" value={stats.clientesAguardandoRetorno} icon={Clock} color="text-yellow-500" />
          <StatCard title="Em Risco" value={stats.clientesEmRisco} icon={AlertCircle} color="text-red-500" />
          
          <StatCard title="Atend. Hoje" value={stats.atendimentosHoje} icon={CalendarDays} color="text-purple-500" />
          <StatCard title="Faturamento" value={`R$ ${stats.faturamentoHoje.toFixed(2)}`} icon={Banknote} color="text-emerald-500" />
          <StatCard title="Cupons Usados" value={stats.cuponsUtilizados} icon={Ticket} color="text-orange-500" />
          <StatCard title="Taxa Retorno" value={`${stats.taxaRetorno}%`} icon={Activity} color="text-indigo-500" />
        </div>
      ) : null}

      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        <Card className="md:col-span-2 shadow-sm border-border/60">
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
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25}/>
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R${val}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
                      itemStyle={{ color: '#f59e0b' }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Receita']}
                    />
                    <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" dot={false} activeDot={{ r: 5, fill: '#f59e0b', stroke: '#0d1117', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] md:h-[300px] flex items-center justify-center text-muted-foreground text-sm">Sem dados suficientes</div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60">
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
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
                      itemStyle={{ color: '#f59e0b' }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    />
                    <Bar dataKey="value" fill="#f59e0b" radius={[5, 5, 0, 0]} maxBarSize={40} />
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
                  <div className={`p-2 rounded-full flex-shrink-0 ${
                    activity.tipo === 'new_client' ? 'bg-green-500/10 text-green-500' :
                    activity.tipo === 'appointment' ? 'bg-primary/10 text-primary' :
                    'bg-blue-500/10 text-blue-500'
                  }`}>
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
                    <div className="font-semibold text-sm text-emerald-500 flex-shrink-0">
                      +R$ {activity.valor.toFixed(2)}
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

const colorMap: Record<string, { bg: string; iconBg: string; text: string; border: string }> = {
  "text-blue-500":    { bg: "bg-blue-500/5",    iconBg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-l-blue-500/60" },
  "text-green-500":   { bg: "bg-green-500/5",   iconBg: "bg-green-500/15",   text: "text-green-400",   border: "border-l-green-500/60" },
  "text-yellow-500":  { bg: "bg-yellow-500/5",  iconBg: "bg-yellow-500/15",  text: "text-yellow-400",  border: "border-l-yellow-500/60" },
  "text-red-500":     { bg: "bg-red-500/5",     iconBg: "bg-red-500/15",     text: "text-red-400",     border: "border-l-red-500/60" },
  "text-purple-500":  { bg: "bg-purple-500/5",  iconBg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-l-purple-500/60" },
  "text-emerald-500": { bg: "bg-emerald-500/5", iconBg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-l-emerald-500/60" },
  "text-orange-500":  { bg: "bg-orange-500/5",  iconBg: "bg-orange-500/15",  text: "text-orange-400",  border: "border-l-orange-500/60" },
  "text-indigo-500":  { bg: "bg-indigo-500/5",  iconBg: "bg-indigo-500/15",  text: "text-indigo-400",  border: "border-l-indigo-500/60" },
};

function StatCard({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: any, color: string }) {
  const c = colorMap[color] ?? { bg: "", iconBg: "bg-secondary", text: color, border: "border-l-border" };
  return (
    <div className={`rounded-xl border border-border/60 border-l-2 ${c.border} ${c.bg} p-3 md:p-5 flex flex-col justify-between gap-2 md:gap-3 shadow-sm transition-all hover:border-border`}>
      <div className="flex justify-between items-start">
        <p className="text-[11px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight">{title}</p>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${c.text}`} />
        </div>
      </div>
      <h3 className="text-xl md:text-2xl font-bold truncate tracking-tight">{value}</h3>
    </div>
  );
}
