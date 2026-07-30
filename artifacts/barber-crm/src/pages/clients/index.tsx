import { useState } from "react";
import { Link } from "wouter";
import { 
  useListClients, 
  getListClientsQueryKey, 
  ClientStatus,
  useDeleteClient
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Search, UserPlus, MoreHorizontal, Eye, Trash, Phone, Users } from "lucide-react";
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
import { useDebounce } from "@/hooks/use-debounce";

// Avatar sempre no mesmo tom escuro, como o Avatar do app — sem rotação de
// cor por nome, a identidade vem do contraste, não da matiz.
const AVATAR_CLASS = "bg-primary text-primary-foreground";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [status, setStatus] = useState<string>("all");
  
  const queryParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(status !== "all" ? { status: status as ClientStatus } : {})
  };

  const { data: clients, isLoading } = useListClients(queryParams);
  const deleteClient = useDeleteClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Status por valor, não por cor: mais escuro = mais urgente, mais claro =
  // resolvido — mesma escala do app (status.risk/waiting/active).
  const getStatusBadge = (status: ClientStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-muted text-muted-foreground hover:bg-muted border-transparent">Ativo</Badge>;
      case 'awaiting_return':
        return <Badge className="bg-muted-foreground/20 text-foreground hover:bg-muted-foreground/25 border-transparent">Aguardando Retorno</Badge>;
      case 'at_risk':
        return <Badge className="bg-foreground text-background hover:bg-foreground/90 border-transparent">Em Risco</Badge>;
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja remover este cliente?")) {
      deleteClient.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Cliente removido", description: "O cliente foi removido com sucesso." });
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        },
        onError: () => {
          toast({ title: "Erro", description: "Não foi possível remover o cliente.", variant: "destructive" });
        }
      });
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6 flex flex-col h-full w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Gerencie sua base de clientes.</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/clients/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome ou telefone..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="awaiting_return">Aguardando Retorno</SelectItem>
              <SelectItem value="at_risk">Em Risco</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Mobile card list ── */}
      <div className="md:hidden flex flex-col gap-2 flex-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : clients?.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground py-20 gap-3">
            <Users className="h-10 w-10 opacity-40" />
            <p className="font-medium text-foreground">Nenhum cliente encontrado</p>
            <p className="text-sm text-center">Ajuste os filtros ou cadastre um novo cliente.</p>
            <Button variant="outline" asChild><Link href="/clients/new">Cadastrar Cliente</Link></Button>
          </div>
        ) : (
          clients?.map((client) => (
            <Link key={client.id} href={`/clients/${client.id}`}>
              <Card className="active:scale-[0.99] transition-transform cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${AVATAR_CLASS}`}>
                    {client.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{client.nome}</p>
                      {getStatusBadge(client.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{client.telefone}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">{client.totalVisitas} visitas</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {client.ultimoAtendimento
                        ? format(new Date(client.ultimoAtendimento), "dd MMM", { locale: ptBR })
                        : "Nunca"}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                      <Button variant="ghost" className="h-8 w-8 p-0 ml-1 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/clients/${client.id}`} className="cursor-pointer">
                          <Eye className="mr-2 h-4 w-4" />Ver detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`https://wa.me/${client.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                          <Phone className="mr-2 h-4 w-4" />WhatsApp
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-destructive focus:text-destructive">
                        <Trash className="mr-2 h-4 w-4" />Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* ── Desktop table ── */}
      <Card className="hidden md:flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 hidden" />
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10 shadow-[0_1px_0_0_hsl(var(--border)/0.6)]">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Visitas</TableHead>
                <TableHead>Última Visita</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : clients?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Users className="h-10 w-10 mb-4 opacity-50" />
                      <p className="font-medium text-foreground">Nenhum cliente encontrado</p>
                      <p className="text-sm mt-1">Ajuste os filtros ou cadastre um novo cliente.</p>
                      <Button variant="outline" className="mt-4" asChild>
                        <Link href="/clients/new">Cadastrar Cliente</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                clients?.map((client) => (
                  <TableRow key={client.id} className="group">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${AVATAR_CLASS}`}>
                          {client.nome.charAt(0).toUpperCase()}
                        </div>
                        <span>{client.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{client.telefone}</span>
                        {client.email && <span className="text-xs text-muted-foreground">{client.email}</span>}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(client.status)}</TableCell>
                    <TableCell>{client.totalVisitas}</TableCell>
                    <TableCell>
                      {client.ultimoAtendimento 
                        ? format(new Date(client.ultimoAtendimento), "dd MMM yyyy", { locale: ptBR }) 
                        : "Nunca"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/clients/${client.id}`} className="cursor-pointer">
                              <Eye className="mr-2 h-4 w-4" />Ver detalhes
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={`https://wa.me/${client.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                              <Phone className="mr-2 h-4 w-4" />WhatsApp
                            </a>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(client.id)} className="text-destructive focus:text-destructive">
                            <Trash className="mr-2 h-4 w-4" />Remover
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
