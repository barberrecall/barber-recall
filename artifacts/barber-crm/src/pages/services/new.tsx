import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateService, getListServicesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Scissors } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const serviceSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  valor: z.string().min(1, "Informe o valor"),
  duracao: z.string().min(1, "Informe a duração"),
});

type FormValues = z.infer<typeof serviceSchema>;

export default function ServiceNewPage() {
  const [, setLocation] = useLocation();
  const createService = useCreateService();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { nome: "", valor: "", duracao: "30" },
  });

  const onSubmit = (data: FormValues) => {
    createService.mutate({
      data: { nome: data.nome, valor: parseFloat(data.valor), duracao: parseInt(data.duracao, 10) }
    }, {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Serviço cadastrado com sucesso." });
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        setLocation("/services");
      },
      onError: () => {
        toast({ title: "Erro", description: "Ocorreu um erro ao cadastrar o serviço.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/services">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Novo Serviço</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Cadastre um novo serviço oferecido pela barbearia.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" />
            Informações do Serviço
          </CardTitle>
          <CardDescription>Preencha os dados para cadastro.</CardDescription>
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
                      <FormControl><Input type="number" step="0.01" min="0" placeholder="45.00" {...field} /></FormControl>
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
                      <FormControl><Input type="number" step="1" min="1" placeholder="30" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" asChild>
                  <Link href="/services">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={createService.isPending}>
                  {createService.isPending ? "Salvando..." : "Salvar Serviço"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
