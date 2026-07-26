import { Link, useLocation, useParams } from "wouter";
import { 
  useGetClient, 
  useGetClientAppointments,
  getGetClientQueryKey,
  getGetClientAppointmentsQueryKey,
  ClientStatus
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Phone, Mail, Calendar, Edit, MessageSquare, Scissors, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Parseia string "YYYY-MM-DD" como data local, evitando o offset UTC do new Date(). */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  return new Date(year, month - 1, day);
}
import { Skeleton } from "@/components/ui/skeleton";

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = params?.id ? parseInt(params.id) : 0;
  const { data: client, isLoading: clientLoading } = useGetClient(clientId, { query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId) } });
  const { data: appointments, isLoading: apptsLoading } = useGetClientAppointments(clientId, { query: { enabled: !!clientId, queryKey: getGetClientAppointmentsQueryKey(clientId) } });

  const getStatusBadge = (status?: ClientStatus) => {
    if (!status) return null;
    switch (status) {
      case 'active': return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 py-0.5">Ativo</Badge>;
      case 'awaiting_return': return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-0.5">Aguardando Retorno</Badge>;
      case 'at_risk': return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 px-3 py-0.5">Em Risco</Badge>;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="h-9 w-9 flex-shrink-0">
            <Link href="/clients"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-3xl font-bold tracking-tight">
                {clientLoading ? <Skeleton className="h-8 w-40 inline-block" /> : client?.nome}
              </h1>
              {!clientLoading && getStatusBadge(client?.status)}
            </div>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto pl-12 sm:pl-0">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none" asChild>
            <Link href={`/clients/${clientId}/edit`}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </Link>
          </Button>
          <Button
            size="sm"
            className="flex-1 sm:flex-none bg-[#25D366] hover:bg-[#1EBE5D] text-white"
            onClick={() => {
              if (!client?.telefone) return;
              const digits = client.telefone.replace(/\D/g, "");
              const number = digits.startsWith("55") ? digits : `55${digits}`;
              // Require at least a valid BR mobile: country(2) + area(2) + number(8–9) = 12–13 digits
              if (number.length < 12) {
                return;
              }
              window.open(`https://wa.me/${number}`, "_blank", "noopener,noreferrer");
            }}
          >
            <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp
          </Button>
        </div>
      </div>

      {/* Profile + History */}
      <div className="grid md:grid-cols-3 gap-4 md:gap-6">
        {/* Info Card */}
        <Card className="md:col-span-1 border-border/60 shadow-sm h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {clientLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">WhatsApp</p>
                      <p className="font-medium">{client?.telefone}</p>
                    </div>
                  </div>
                  
                  {client?.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Email</p>
                        <p className="font-medium truncate">{client.email}</p>
                      </div>
                    </div>
                  )}

                  {client?.dataNascimento && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground flex-shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Nascimento</p>
                        <p className="font-medium">{format(parseLocalDate(client.dataNascimento), "dd 'de' MMMM", { locale: ptBR })}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total de Visitas</p>
                    <p className="text-2xl font-bold">{client?.totalVisitas}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente desde</p>
                    <p className="text-lg font-medium">{client?.createdAt ? format(new Date(client.createdAt), "MMM/yy", { locale: ptBR }) : '-'}</p>
                  </div>
                </div>

                {client?.observacoes && (
                  <div className="border-t border-border/60 pt-4">
                    <p className="text-xs text-muted-foreground mb-2">Observações</p>
                    <p className="text-sm bg-secondary/50 p-3 rounded-md border border-border/40">
                      {client.observacoes}
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Appointments History */}
        <Card className="md:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Scissors className="h-4 w-4 text-primary" />
                Histórico de Atendimentos
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Todos os serviços realizados por este cliente.
              </CardDescription>
            </div>
            <Button size="sm" asChild className="flex-shrink-0">
              <Link href={`/appointments/new?client=${clientId}`}>Novo</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {apptsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : appointments?.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground bg-secondary/20 rounded-lg border border-dashed border-border">
                <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhum atendimento registrado.</p>
              </div>
            ) : (
              <div className="relative border-l-2 border-border/60 ml-3 pl-5 space-y-6 py-2">
                {appointments?.map((appt) => (
                  <div key={appt.id} className="relative">
                    <div className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-primary bg-background ring-4 ring-background" />
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm">{appt.servicoNome || 'Serviço Personalizado'}</h4>
                        <div className="flex flex-wrap items-center text-xs text-muted-foreground gap-x-2 gap-y-0.5 mt-1">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {appt.barbeiroNome}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {format(new Date(appt.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {appt.observacoes && (
                          <p className="text-xs mt-1.5 text-muted-foreground italic">"{appt.observacoes}"</p>
                        )}
                      </div>
                      <div className="text-left sm:text-right flex-shrink-0">
                        <div className="font-bold text-emerald-500 text-sm">R$ {appt.valorFinal.toFixed(2)}</div>
                        {appt.desconto && appt.desconto > 0 ? (
                          <div className="text-xs text-muted-foreground line-through">R$ {appt.valor.toFixed(2)}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
