import { useEffect } from "react";
import { useLocation, Link, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useGetClient,
  useUpdateClient,
  getGetClientQueryKey,
  getListClientsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const editSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  telefone: z.string().min(10, "Telefone inválido"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  dataNascimento: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional(),
});

type FormValues = z.infer<typeof editSchema>;

// Status é derivado do histórico de atendimentos (skill client-recall-logic),
// por isso aparece como leitura e não como campo editável.
const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  awaiting_return: "Aguardando Retorno",
  at_risk: "Em Risco",
};

export default function ClientEditPage() {
  const params = useParams<{ id: string }>();
  const clientId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: client, isLoading } = useGetClient(clientId, {
    query: { enabled: !!clientId, queryKey: getGetClientQueryKey(clientId) },
  });
  const updateClient = useUpdateClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nome: "",
      telefone: "",
      email: "",
      dataNascimento: "",
      observacoes: "",
    },
  });

  // Populate form when client data arrives
  useEffect(() => {
    if (client) {
      form.reset({
        nome: client.nome,
        telefone: client.telefone,
        email: client.email ?? "",
        dataNascimento: client.dataNascimento ? client.dataNascimento.split("T")[0] : "",
        observacoes: client.observacoes ?? "",
      });
    }
  }, [client, form]);

  const onSubmit = (data: FormValues) => {
    updateClient.mutate(
      { id: clientId, data },
      {
        onSuccess: () => {
          toast({ title: "Cliente atualizado", description: "As informações foram salvas com sucesso." });
          queryClient.invalidateQueries({ queryKey: getGetClientQueryKey(clientId) });
          queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
          setLocation(`/clients/${clientId}`);
        },
        onError: () => {
          toast({ title: "Erro", description: "Não foi possível salvar as alterações.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center">
        <p className="text-muted-foreground">Cliente não encontrado.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/clients">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clients/${clientId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Editar Cliente</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{client.nome}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Informações do Cliente
          </CardTitle>
          <CardDescription>Altere os dados e salve para atualizar o cadastro.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl><Input placeholder="João da Silva" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp *</FormLabel>
                      <FormControl><Input placeholder="(11) 99999-9999" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Opcional)</FormLabel>
                      <FormControl><Input type="email" placeholder="joao@exemplo.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dataNascimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento (Opcional)</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem className="md:col-span-2">
                  <FormLabel>Status do Cliente</FormLabel>
                  <div className="flex h-10 items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
                    {STATUS_LABELS[client.status] ?? "—"}
                  </div>
                  <FormDescription>
                    Calculado automaticamente a partir do último atendimento e do intervalo de retorno da barbearia.
                  </FormDescription>
                </FormItem>
              </div>

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Preferências de corte, restrições, etc."
                        className="resize-none min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" asChild>
                  <Link href={`/clients/${clientId}`}>Cancelar</Link>
                </Button>
                <Button type="submit" disabled={updateClient.isPending}>
                  {updateClient.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
