import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useCreateCampaign, 
  useListCoupons,
  getListCampaignsQueryKey,
  CampaignInputTipo
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MessageSquare, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const campaignSchema = z.object({
  nome: z.string().min(3, "Nome é obrigatório"),
  tipo: z.nativeEnum(CampaignInputTipo),
  dias: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number({ required_error: "Dias é obrigatório", invalid_type_error: "Informe um número válido" }).int().min(0, "Mínimo 0 dias")
  ),
  mensagem: z.string().min(10, "A mensagem precisa ter pelo menos 10 caracteres"),
  cupomId: z.string().optional()
});

type FormValues = z.infer<typeof campaignSchema>;

const TEMPLATES = {
  return: "Fala {nome}! Tudo bem? Vi aqui que já faz {dias} dias que você não dá um tapa no visual. Que tal agendar um horário essa semana? {cupom_texto}",
  birthday: "Feliz aniversário {nome}! 🎉 Pra comemorar, preparamos um presente especial para você vir dar aquele trato no visual hoje. {cupom_texto}",
  loyalty: "Obrigado pela preferência, {nome}! Você completou mais um ciclo com a gente. Para sua próxima visita, temos uma surpresa: {cupom_texto}"
};

export default function CampaignNewPage() {
  const [, setLocation] = useLocation();
  const { data: coupons } = useListCoupons();
  const createCampaign = useCreateCampaign();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      nome: "",
      tipo: "return",
      dias: 30,
      mensagem: TEMPLATES.return,
      cupomId: "none"
    }
  });

  const watchTipo = form.watch("tipo");

  const handleTipoChange = (val: CampaignInputTipo) => {
    form.setValue("tipo", val);
    if (TEMPLATES[val as keyof typeof TEMPLATES]) {
      form.setValue("mensagem", TEMPLATES[val as keyof typeof TEMPLATES]);
    }

    // Default days based on type
    if (val === 'return') form.setValue("dias", 30);
    if (val === 'birthday') form.setValue("dias", 0);
  };

  const onSubmit = (data: any) => {
    const payload = {
      nome: data.nome,
      tipo: data.tipo,
      dias: data.dias,
      mensagem: data.mensagem,
      cupomId: data.cupomId !== "none" ? parseInt(data.cupomId) : undefined
    };

    createCampaign.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: "Campanha criada", description: "Sua campanha já está ativa e rodando." });
        queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
        setLocation("/campaigns");
      },
      onError: () => {
        toast({ title: "Erro", description: "Não foi possível criar a campanha.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 md:space-y-6 pb-8">
      <div className="flex items-center gap-3 md:gap-4">
        <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
          <Link href="/campaigns">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Nova Campanha</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Configure o envio automático de mensagens via WhatsApp.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        <div className="md:col-span-3 space-y-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Configuração da Regra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form id="campaign-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Campanha</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Recuperação 30 dias" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tipo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Gatilho</FormLabel>
                          <Select onValueChange={handleTipoChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="return">Ausência (Retorno)</SelectItem>
                              <SelectItem value="birthday">Aniversário</SelectItem>
                              <SelectItem value="loyalty">Fidelidade</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dias"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {watchTipo === 'return' ? 'Dias após última visita' : 
                             watchTipo === 'birthday' ? 'Dias de antecedência' : 'Dias após atingir meta'}
                          </FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="cupomId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anexar Cupom (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Nenhum cupom" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Nenhum cupom</SelectItem>
                            {coupons?.map(c => (
                              <SelectItem key={c.id} value={c.id.toString()}>{c.codigo} ({c.tipo === 'percent' ? `${c.valor}%` : `R$${c.valor}`})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Se selecionado, a variável {"{cupom_texto}"} será substituída pelas regras do cupom.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mensagem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem do WhatsApp</FormLabel>
                        <FormControl>
                          <Textarea 
                            className="min-h-[150px] font-mono text-sm resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80" onClick={() => form.setValue("mensagem", field.value + " {nome}")}>{"{nome}"}</Badge>
                          <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80" onClick={() => form.setValue("mensagem", field.value + " {dias}")}>{"{dias}"}</Badge>
                          <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80" onClick={() => form.setValue("mensagem", field.value + " {cupom_texto}")}>{"{cupom_texto}"}</Badge>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/60 shadow-sm bg-secondary/20 h-fit sticky top-20">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Preview do WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 bg-[#EFEAE2] dark:bg-[#0b141a] p-4 h-[180px] md:h-[400px] flex flex-col justify-end rounded-b-xl overflow-hidden">
              <div className="bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] p-3 rounded-xl rounded-tr-none shadow-sm max-w-[90%] self-end text-sm break-words relative pb-6">
                {(form.watch("mensagem") ?? "")
                  .replace(/\{nome\}/g, "João")
                  .replace(/\{dias\}/g, String(form.watch("dias") ?? "30"))
                  .replace(/\{cupom_texto\}/g, form.watch("cupomId") !== "none" ? "Use o cupom RETORNO15 e ganhe 15% de desconto" : "")
                }
                <div className="absolute bottom-1 right-2 text-[10px] text-black/40 dark:text-white/40">14:30 ✓✓</div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" className="flex-1" asChild>
              <Link href="/campaigns">Cancelar</Link>
            </Button>
            <Button type="submit" form="campaign-form" className="flex-1" disabled={createCampaign.isPending}>
              {createCampaign.isPending ? "Salvando..." : "Criar Campanha"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}