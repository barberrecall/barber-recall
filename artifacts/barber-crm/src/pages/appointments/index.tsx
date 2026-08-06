import { useState } from "react";
import { Link } from "wouter";
import { 
  useListAppointments, 
  useListBarbers,
  getListAppointmentsQueryKey,
  useDeleteAppointment
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CalendarDays, Plus, MoreHorizontal, Trash, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/money";

export default function AppointmentsPage() {
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [barberId, setBarberId] = useState<string>("all");
  
  const queryParams = {
    ...(date ? { date } : {}),
    ...(barberId !== "all" ? { barberId: parseInt(barberId) } : {})
  };

  const { data: appointments, isLoading } = useListAppointments(queryParams);
  const { data: barbers } = useListBarbers();
  const deleteAppointment = useDeleteAppointment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja cancelar este agendamento?")) {
      deleteAppointment.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Agendamento cancelado", description: "O agendamento foi removido com sucesso." });
          queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        },
        onError: () => {
          toast({ title: "Erro", description: "Não foi possível cancelar o agendamento.", variant: "destructive" });
        }
      });
    }
  };

  const totalRevenue = appointments?.reduce((sum, appt) => sum + appt.valorFinal, 0) || 0;
  const sorted = appointments?.slice().sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6 flex flex-col h-full w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Atendimentos</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Gerencie a agenda e os serviços realizados.</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/appointments/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Agendamento
          </Link>
        </Button>
      </div>

      {/* Filters row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Data</label>
          <Input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Barbeiro</label>
          <Select value={barberId} onValueChange={setBarberId}>
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {barbers?.map(b => (
                <SelectItem key={b.id} value={b.id.toString()}>{b.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Card className="col-span-2 md:col-span-1 border border-primary/20 bg-primary/5">
          <CardContent className="p-3 flex flex-row md:flex-col items-center md:items-start justify-between md:justify-center h-full gap-1">
            <p className="text-xs font-medium text-primary">Faturamento do Dia</p>
            <div>
              <p className="text-xl md:text-2xl font-bold text-foreground">
                {isLoading ? <Skeleton className="h-7 w-24 inline-block" /> : formatBRL(totalRevenue)}
              </p>
              <p className="text-xs text-muted-foreground hidden md:block">
                {appointments?.length || 0} atendimentos
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Mobile card list ── */}
      <div className="md:hidden flex flex-col gap-2 flex-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
        ) : sorted?.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground py-20 gap-3">
            <CalendarDays className="h-10 w-10 opacity-40" />
            <p className="font-medium text-foreground">Nenhum atendimento para esta data</p>
            <Button variant="outline" asChild><Link href="/appointments/new">Adicionar Atendimento</Link></Button>
          </div>
        ) : (
          sorted?.map((appt) => (
            <Card key={appt.id} className="border border-border">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="text-center flex-shrink-0 w-12">
                  <p className="text-base font-bold text-primary">{format(new Date(appt.data), "HH:mm")}</p>
                  <p className="text-[10px] text-muted-foreground">{format(new Date(appt.data), "dd/MM")}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    <Link href={`/clients/${appt.clienteId}`} className="text-primary">{appt.clienteNome}</Link>
                  </p>
                  <p className="text-xs text-muted-foreground">{appt.servicoNome || 'Personalizado'}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3" />{appt.barbeiroNome}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-foreground text-sm">{formatBRL(appt.valorFinal)}</p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-7 w-7 p-0 mt-1 ml-auto block">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDelete(appt.id)} className="text-destructive focus:text-destructive">
                        <Trash className="mr-2 h-4 w-4" />Cancelar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* ── Desktop table ── */}
      <Card className="hidden md:flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_hsl(var(--border)/0.6)]">
              <TableRow>
                <TableHead>Horário</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Barbeiro</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : sorted?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <CalendarDays className="h-10 w-10 mb-4 opacity-50" />
                      <p className="font-medium text-foreground">Nenhum atendimento para esta data</p>
                      <Button variant="outline" className="mt-4" asChild>
                        <Link href="/appointments/new">Adicionar Atendimento</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sorted?.map((appt) => (
                  <TableRow key={appt.id} className="group">
                    <TableCell className="font-medium">{format(new Date(appt.data), "HH:mm")}</TableCell>
                    <TableCell>
                      <Link href={`/clients/${appt.clienteId}`} className="font-medium text-primary hover:underline">
                        {appt.clienteNome}
                      </Link>
                    </TableCell>
                    <TableCell>{appt.servicoNome || 'Personalizado'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {appt.barbeiroNome}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatBRL(appt.valorFinal)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDelete(appt.id)} className="text-destructive focus:text-destructive">
                            <Trash className="mr-2 h-4 w-4" />Cancelar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
