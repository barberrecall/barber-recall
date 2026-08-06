import { useEffect } from "react";
import { useLocation, Link, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListServices,
  useUpdateService,
  useDeleteService,
  getListServicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Scissors, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const serviceSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  valor: z.string().min(1, "Informe o valor"),
  duracao: z.string().min(1, "Informe a duração"),
});

type FormValues = z.infer<typeof serviceSchema>;

// Não há GET /services/:id — a lista já vem inteira em toda tela que precisa
// de serviços, então buscar o registro na lista já carregada evita mais uma
// ida ao servidor.
export default function ServiceEditPage() {
  const params = useParams<{ id: string }>();
  const serviceId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: services, isLoading } = useListServices();
  const service = services?.find((s) => s.id === serviceId);
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const form = useForm<FormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { nome: "", valor: "", duracao: "" },
  });

  useEffect(() => {
    if (service) {
      form.reset({
        nome: service.nome,
        valor: String(service.valor),
        duracao: String(service.duracao),
      });
    }
  }, [service, form]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });

  const onSubmit = (data: FormValues) => {
    updateService.mutate(
      {
        id: serviceId,
        data: { nome: data.nome, valor: parseFloat(data.valor), duracao: parseInt(data.duracao, 10) },
      },
      {
        onSuccess: () => {
          toast({ title: "Serviço atualizado", description: "As informações foram salvas com sucesso." });
          invalidate();
          setLocation("/services");
        },
        onError: () => {
          toast({ title: "Erro", description: "Não foi possível salvar as alterações.", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!service) return;
    if (confirm(`Excluir ${service.nome}? Os atendimentos já registrados continuam existindo, mas deixam de mostrar o serviço.`)) {
      deleteService.mutate({ id: serviceId }, {
        onSuccess: () => {
          toast({ title: "Serviço excluído" });
          invalidate();
          setLocation("/services");
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center">
        <p className="text-muted-foreground">Serviço não encontrado.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/services">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/services">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Editar Serviço</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{service.nome}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            Informações do Serviço
          </CardTitle>
          <CardDescription>Altere os dados e salve para atualizar o cadastro.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input placeholder="Corte + Barba" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$) *</FormLabel>
                      <FormControl><Input type="number" step="0.01" min="0" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="duracao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração (min) *</FormLabel>
                      <FormControl><Input type="number" step="1" min="1" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Serviço
                </Button>
                <div className="flex gap-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/services">Cancelar</Link>
                  </Button>
                  <Button type="submit" disabled={updateService.isPending}>
                    {updateService.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
