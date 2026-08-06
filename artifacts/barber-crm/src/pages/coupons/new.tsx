import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useCreateCoupon, 
  getListCouponsQueryKey,
  CouponInputTipo
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Ticket, Wand2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { MoneyInput } from "@/components/money-input";
import { parseMoney } from "@/lib/money";

const couponSchema = z.object({
  codigo: z.string().min(3, "Código deve ter pelo menos 3 caracteres"),
  tipo: z.nativeEnum(CouponInputTipo),
  // `parseFloat` parava na vírgula: "45,50" virava cupom de R$ 45,00 e os
  // centavos sumiam sem aviso. `parseMoney` lê os dois separadores.
  valor: z
    .string()
    .min(1, "Valor é obrigatório")
    .refine((v) => Number.isFinite(parseMoney(v)), "Valor inválido")
    .transform(parseMoney),
  usoMaximo: z.string().optional().transform(v => v ? parseInt(v) : undefined),
  validade: z.string().optional().or(z.literal(""))
});

export default function CouponNewPage() {
  const [, setLocation] = useLocation();
  const createCoupon = useCreateCoupon();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof couponSchema>>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      codigo: "",
      tipo: "percent",
      valor: "" as any,
      usoMaximo: "" as any,
      validade: ""
    }
  });

  const generateCode = () => {
    const prefix = "VIP";
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    form.setValue("codigo", `${prefix}${random}`);
  };

  const onSubmit = (data: any) => {
    createCoupon.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Cupom criado com sucesso" });
        queryClient.invalidateQueries({ queryKey: getListCouponsQueryKey() });
        setLocation("/coupons");
      },
      onError: () => {
        toast({ title: "Erro", description: "O código já existe ou dados inválidos.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 md:space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/coupons">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Cupom</h1>
          <p className="text-muted-foreground mt-1">Crie um cupom de desconto para suas campanhas.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Configuração do Cupom
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código do Cupom *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="Ex: RETORNO15" className="uppercase font-mono" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                      </FormControl>
                      <Button type="button" variant="secondary" onClick={generateCode} className="shrink-0">
                        <Wand2 className="h-4 w-4 mr-2" /> Gerar
                      </Button>
                    </div>
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
                      <FormLabel>Tipo de Desconto</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percent">Porcentagem (%)</SelectItem>
                          <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor *</FormLabel>
                      <FormControl>
                        {/*
                          Só o cupom de valor fixo é dinheiro. No percentual o
                          "R$" ao lado do campo diria a coisa errada, então lá
                          continua um número simples.
                        */}
                        {form.watch("tipo") === "percent" ? (
                          <Input type="number" step="1" min="0" placeholder="10" {...field} />
                        ) : (
                          <MoneyInput placeholder="10,00" {...field} value={String(field.value ?? "")} onChange={field.onChange} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="usoMaximo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limite de Usos (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" placeholder="Ilimitado se vazio" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="validade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Validade (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" asChild>
                  <Link href="/coupons">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={createCoupon.isPending}>
                  {createCoupon.isPending ? "Salvando..." : "Criar Cupom"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}