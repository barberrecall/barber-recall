import { useEffect } from "react";
import { useLocation, Link, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListBarbers,
  useUpdateBarber,
  useDeleteBarber,
  getListBarbersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, UserCog, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const barberSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  telefone: z.string().optional(),
});

type FormValues = z.infer<typeof barberSchema>;

// Não há GET /barbers/:id — a lista já vem inteira em toda tela que precisa
// de barbeiros, então buscar o registro na lista já carregada evita mais uma
// ida ao servidor.
export default function BarberEditPage() {
  const params = useParams<{ id: string }>();
  const barberId = params?.id ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: barbers, isLoading } = useListBarbers();
  const barber = barbers?.find((b) => b.id === barberId);
  const updateBarber = useUpdateBarber();
  const deleteBarber = useDeleteBarber();

  const form = useForm<FormValues>({
    resolver: zodResolver(barberSchema),
    defaultValues: { nome: "", telefone: "" },
  });

  useEffect(() => {
    if (barber) {
      form.reset({ nome: barber.nome, telefone: barber.telefone ?? "" });
    }
  }, [barber, form]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListBarbersQueryKey() });

  const onSubmit = (data: FormValues) => {
    updateBarber.mutate(
      { id: barberId, data: { nome: data.nome, telefone: data.telefone || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Barbeiro atualizado", description: "As informações foram salvas com sucesso." });
          invalidate();
          setLocation("/barbers");
        },
        onError: () => {
          toast({ title: "Erro", description: "Não foi possível salvar as alterações.", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!barber) return;
    if (confirm(`Excluir ${barber.nome}? Os atendimentos já registrados continuam existindo, mas deixam de mostrar o nome dele.`)) {
      deleteBarber.mutate({ id: barberId }, {
        onSuccess: () => {
          toast({ title: "Barbeiro excluído" });
          invalidate();
          setLocation("/barbers");
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

  if (!barber) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center">
        <p className="text-muted-foreground">Barbeiro não encontrado.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/barbers">Voltar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/barbers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Editar Barbeiro</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">{barber.nome}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Informações do Barbeiro
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
                      <FormLabel>Nome *</FormLabel>
                      <FormControl><Input placeholder="Carlos Mendes" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone (Opcional)</FormLabel>
                      <FormControl><Input placeholder="(11) 99999-9999" {...field} /></FormControl>
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
                  Excluir Barbeiro
                </Button>
                <div className="flex gap-4">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/barbers">Cancelar</Link>
                  </Button>
                  <Button type="submit" disabled={updateBarber.isPending}>
                    {updateBarber.isPending ? "Salvando..." : "Salvar Alterações"}
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
