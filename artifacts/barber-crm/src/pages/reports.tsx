import { useGetReportsOverview, useGetRevenueReport, useGetClientReport } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from "recharts";
import { Banknote, Users, Activity, Ticket, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function ReportsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  
  const { data: overview, isLoading: overLoading } = useGetReportsOverview({ period });
  const { data: revData, isLoading: revLoading } = useGetRevenueReport({ period });
  const { data: clientData, isLoading: clientLoading } = useGetClientReport({ period });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 md:space-y-8 w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Análise profunda do desempenho do seu negócio.</p>
        </div>
        <Tabs value={period} onValueChange={(v: any) => setPeriod(v)} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="week">Semana</TabsTrigger>
            <TabsTrigger value="month">Mês</TabsTrigger>
            <TabsTrigger value="year">Ano</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard loading={overLoading} title="Receita Média Diária" value={`R$ ${overview?.receitaDiaria?.toFixed(2) || '0.00'}`} icon={Banknote} />
        <StatCard loading={overLoading} title="Ticket Médio" value={`R$ ${overview?.ticketMedio?.toFixed(2) || '0.00'}`} icon={TrendingUp} />
        <StatCard loading={overLoading} title="Novos / Recorrentes" value={`${overview?.clientesNovos || 0} / ${overview?.clientesRecorrentes || 0}`} icon={Users} />
        <StatCard loading={overLoading} title="Retorno Médio" value={`${overview?.tempoMedioRetorno || 0}d`} icon={Clock} />
        <StatCard loading={overLoading} title="Camp. Enviadas" value={overview?.campanhasEnviadas || 0} icon={Activity} />
        <StatCard loading={overLoading} title="Taxa de Retorno" value={`${overview?.taxaRetorno || 0}%`} icon={TrendingUp} />
        <StatCard loading={overLoading} title="Cupons Usados" value={overview?.cuponsUsados || 0} icon={Ticket} />
        <StatCard loading={overLoading} title="Taxa de Abertura" value={`${overview?.taxaAbertura || 0}%`} icon={Activity} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 md:gap-6">
        {/* Revenue Chart */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">Receita x Atendimentos</CardTitle>
          </CardHeader>
          <CardContent>
            {revLoading ? (
              <Skeleton className="h-[220px] md:h-[300px] w-full" />
            ) : (
              <div className="h-[220px] md:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25}/>
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02}/>
                      </linearGradient>
                      <linearGradient id="colorAppt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `R${v}`} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" name="Receita" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" dot={false} activeDot={{ r: 4, fill: '#f59e0b' }} />
                    <Area yAxisId="right" type="monotone" dataKey="appointments" name="Atendimentos" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorAppt)" dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clients Chart */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">Aquisição e Retenção</CardTitle>
          </CardHeader>
          <CardContent>
            {clientLoading ? (
              <Skeleton className="h-[220px] md:h-[300px] w-full" />
            ) : (
              <div className="h-[220px] md:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="novos" name="Novos Clientes" stackId="a" fill="#10b981" radius={[0, 0, 3, 3]} maxBarSize={40} />
                    <Bar dataKey="recorrentes" name="Recorrentes" stackId="a" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, loading }: { title: string, value: string | number, icon: any, loading: boolean }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 md:p-5 flex flex-col justify-between gap-2 md:gap-3 shadow-sm">
      <div className="flex justify-between items-start">
        <p className="text-[11px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight">{title}</p>
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>
      {loading ? <Skeleton className="h-7 w-20" /> : <h3 className="text-lg md:text-2xl font-bold truncate tracking-tight">{value}</h3>}
    </div>
  );
}
