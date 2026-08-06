import { Link } from "wouter";
import {
  useListServices,
  useUpdateService,
  useDeleteService,
  getListServicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Scissors, Trash2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/money";

export default function ServicesPage() {
  const { data: services, isLoading } = useListServices();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });

  const handleToggle = (service: NonNullable<typeof services>[0]) => {
    updateService.mutate(
      { id: service.id, data: { ativo: !service.ativo } },
      { onSuccess: invalidate }
    );
  };

  const handleDelete = (service: NonNullable<typeof services>[0]) => {
    if (confirm(`Excluir ${service.nome}? Os atendimentos já registrados continuam existindo, mas deixam de mostrar o serviço.`)) {
      deleteService.mutate({ id: service.id }, {
        onSuccess: () => {
          toast({ title: "Serviço excluído" });
          invalidate();
        }
      });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6 flex flex-col h-full w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Serviços</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Gerencie os serviços oferecidos pela barbearia.</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/services/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Serviço
          </Link>
        </Button>
      </div>

      {/* ── Mobile card list ── */}
      <div className="md:hidden flex flex-col gap-3 flex-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
        ) : services?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Scissors className="h-10 w-10 opacity-40" />
            <p className="font-medium text-foreground">Nenhum serviço cadastrado</p>
            <p className="text-sm text-center">Cadastre os serviços para preencher o valor automaticamente ao registrar um atendimento.</p>
            <Button variant="outline" asChild><Link href="/services/new">Cadastrar Serviço</Link></Button>
          </div>
        ) : (
          services?.map((service) => (
            <Card key={service.id} className={!service.ativo ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-center gap-3">
                <Link href={`/services/${service.id}/edit`} className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{service.nome}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground text-sm">{formatBRL(service.valor)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {service.duracao} min
                    </span>
                  </div>
                </Link>
                <Switch checked={service.ativo} onCheckedChange={() => handleToggle(service)} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 flex-shrink-0 h-8 w-8"
                  onClick={() => handleDelete(service)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
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
                <TableHead>Nome</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : services?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Scissors className="h-10 w-10 mb-4 opacity-50" />
                      <p className="font-medium text-foreground">Nenhum serviço cadastrado</p>
                      <p className="text-sm mt-1">Cadastre os serviços para preencher o valor automaticamente ao registrar um atendimento.</p>
                      <Button variant="outline" className="mt-4" asChild>
                        <Link href="/services/new">Cadastrar Serviço</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                services?.map((service) => (
                  <TableRow key={service.id} className={!service.ativo ? "opacity-60" : ""}>
                    <TableCell className="font-medium">
                      <Link href={`/services/${service.id}/edit`} className="hover:underline">
                        {service.nome}
                      </Link>
                    </TableCell>
                    <TableCell className="font-semibold">{formatBRL(service.valor)}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {service.duracao} min
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch checked={service.ativo} onCheckedChange={() => handleToggle(service)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(service)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
