import { useGetBarbershop, useUpdateBarbershop } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Save, MessageCircle, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const settingsSchema = z.object({
  nome: z.string().min(2),
  telefone: z.string().min(10),
  email: z.string().email(),
  cidade: z.string().min(2),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  corPrimaria: z.string(),
  diasRetorno: z.string().transform(v => parseInt(v)),
  mensagemPadrao: z.string().optional()
});

type FormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { data: shop, isLoading } = useGetBarbershop();
  const updateBarbershop = useUpdateBarbershop();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      nome: "",
      telefone: "",
      email: "",
      cidade: "",
      whatsapp: "",
      instagram: "",
      corPrimaria: "#F59E0B",
      diasRetorno: 30 as any,
      mensagemPadrao: ""
    }
  });

  useEffect(() => {
    if (shop) {
      form.reset({
        nome: shop.nome,
        telefone: shop.telefone,
        email: shop.email,
        cidade: shop.cidade,
        whatsapp: shop.whatsapp || "",
        instagram: shop.instagram || "",
        corPrimaria: shop.corPrimaria || "#F59E0B",
        diasRetorno: shop.diasRetorno as any || 30,
        mensagemPadrao: shop.mensagemPadrao || ""
      });
    }
  }, [shop, form]);

  const onSubmit = (data: FormValues) => {
    updateBarbershop.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Configurações salvas", description: "As informações da barbearia foram atualizadas." });
        document.documentElement.style.setProperty('--primary', data.corPrimaria);
      },
      onError: () => {
        toast({ title: "Erro", description: "Falha ao salvar configurações.", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6"><Skeleton className="h-[600px] w-full" /></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5 md:space-y-6 pb-28 md:pb-24 w-full">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">Gerencie os dados e preferências da sua barbearia.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 md:space-y-8">
          
          {/* Dados Básicos */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Store className="h-5 w-5 text-primary" />
                Dados Básicos
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 md:gap-6">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem><FormLabel>Nome da Barbearia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="telefone" render={({ field }) => (
                <FormItem><FormLabel>Telefone Principal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email de Contato</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="cidade" render={({ field }) => (
                <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Presença Digital */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <MessageCircle className="h-5 w-5 text-primary" />
                Presença Digital
              </CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 md:gap-6">
              <FormField control={form.control} name="whatsapp" render={({ field }) => (
                <FormItem><FormLabel>WhatsApp de Atendimento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="instagram" render={({ field }) => (
                <FormItem><FormLabel>Perfil do Instagram (@)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Preferências CRM */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Settings className="h-5 w-5 text-primary" />
                Preferências do CRM
              </CardTitle>
              <CardDescription>Padrões usados nos cálculos de retenção.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
                <FormField control={form.control} name="diasRetorno" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dias para "Em Risco"</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <p className="text-xs text-muted-foreground mt-1">Após quantos dias sem visita um cliente entra em risco.</p>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="corPrimaria" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor Principal (Accent)</FormLabel>
                    <div className="flex gap-3">
                      <FormControl><Input type="color" className="w-14 p-1 h-10 flex-shrink-0" {...field} /></FormControl>
                      <Input value={field.value} onChange={field.onChange} className="font-mono uppercase" />
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="mensagemPadrao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assinatura Padrão (WhatsApp)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ex: Um abraço da equipe Barber Recall!" className="resize-none" rows={3} {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">Adicionado ao final de mensagens automáticas.</p>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Sticky save bar — corrected left offset for desktop (accounts for sidebar width) */}
          <div className="flex justify-end gap-3 fixed bottom-16 md:bottom-0 left-0 md:left-64 right-0 p-4 bg-card/95 backdrop-blur border-t border-border z-10 shadow-lg">
            <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => form.reset()}>
              Desfazer
            </Button>
            <Button type="submit" disabled={updateBarbershop.isPending} className="flex-1 sm:flex-none">
              <Save className="mr-2 h-4 w-4" />
              {updateBarbershop.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
