import { Link } from "wouter";
import {
  useListBarbers,
  useUpdateBarber,
  useDeleteBarber,
  getListBarbersQueryKey,
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
import { Plus, Users, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function BarbersPage() {
  const { data: barbers, isLoading } = useListBarbers();
  const updateBarber = useUpdateBarber();
  const deleteBarber = useDeleteBarber();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListBarbersQueryKey() });

  const handleToggle = (barber: NonNullable<typeof barbers>[0]) => {
    updateBarber.mutate(
      { id: barber.id, data: { ativo: !barber.ativo } },
      { onSuccess: invalidate }
    );
  };

  const handleDelete = (barber: NonNullable<typeof barbers>[0]) => {
    if (confirm(`Excluir ${barber.nome}? Os atendimentos já registrados continuam existindo, mas deixam de mostrar o nome dele.`)) {
      deleteBarber.mutate({ id: barber.id }, {
        onSuccess: () => {
          toast({ title: "Barbeiro excluído" });
          invalidate();
        }
      });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6 flex flex-col h-full w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Barbeiros</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Gerencie a equipe da barbearia.</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/barbers/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo Barbeiro
          </Link>
        </Button>
      </div>

      {/* ── Mobile card list ── */}
      <div className="md:hidden flex flex-col gap-3 flex-1">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
        ) : barbers?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Users className="h-10 w-10 opacity-40" />
            <p className="font-medium text-foreground">Nenhum barbeiro cadastrado</p>
            <p className="text-sm text-center">Cadastre a equipe para poder filtrar a agenda por barbeiro.</p>
            <Button variant="outline" asChild><Link href="/barbers/new">Cadastrar Barbeiro</Link></Button>
          </div>
        ) : (
          barbers?.map((barber) => (
            <Card key={barber.id} className={!barber.ativo ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-center gap-3">
                <Link href={`/barbers/${barber.id}/edit`} className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{barber.nome}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{barber.telefone || "sem telefone"}</p>
                </Link>
                <Switch checked={barber.ativo} onCheckedChange={() => handleToggle(barber)} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 flex-shrink-0 h-8 w-8"
                  onClick={() => handleDelete(barber)}
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
                <TableHead>Telefone</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : barbers?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="h-10 w-10 mb-4 opacity-50" />
                      <p className="font-medium text-foreground">Nenhum barbeiro cadastrado</p>
                      <p className="text-sm mt-1">Cadastre a equipe para poder filtrar a agenda por barbeiro.</p>
                      <Button variant="outline" className="mt-4" asChild>
                        <Link href="/barbers/new">Cadastrar Barbeiro</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                barbers?.map((barber) => (
                  <TableRow key={barber.id} className={!barber.ativo ? "opacity-60" : ""}>
                    <TableCell className="font-medium">
                      <Link href={`/barbers/${barber.id}/edit`} className="hover:underline">
                        {barber.nome}
                      </Link>
                    </TableCell>
                    <TableCell>{barber.telefone || "—"}</TableCell>
                    <TableCell>
                      <Switch checked={barber.ativo} onCheckedChange={() => handleToggle(barber)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(barber)}>
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
