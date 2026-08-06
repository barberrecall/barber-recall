import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateBarber, getListBarbersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const barberSchema = z.object({
  nome: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  telefone: z.string().optional(),
});

type FormValues = z.infer<typeof barberSchema>;

export default function BarberNewPage() {
  const [, setLocation] = useLocation();
  const createBarber = useCreateBarber();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(barberSchema),
    defaultValues: { nome: "", telefone: "" },
  });

  const onSubmit = (data: FormValues) => {
    createBarber.mutate({ data: { nome: data.nome, telefone: data.telefone || undefined } }, {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Barbeiro cadastrado com sucesso." });
        queryClient.invalidateQueries({ queryKey: getListBarbersQueryKey() });
        setLocation("/barbers");
      },
      onError: () => {
        toast({ title: "Erro", description: "Ocorreu um erro ao cadastrar o barbeiro.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/barbers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Novo Barbeiro</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Cadastre um novo barbeiro na equipe.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Informações do Barbeiro
          </CardTitle>
          <CardDescription>Preencha os dados para cadastro.</CardDescription>
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

              <div className="flex justify-end gap-4 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" asChild>
                  <Link href="/barbers">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={createBarber.isPending}>
                  {createBarber.isPending ? "Salvando..." : "Salvar Barbeiro"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
