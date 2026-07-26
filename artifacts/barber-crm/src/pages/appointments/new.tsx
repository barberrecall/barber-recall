import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  useCreateAppointment, 
  useListClients, 
  useListBarbers, 
  useListServices,
  getListAppointmentsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const appointmentSchema = z.object({
  clienteId: z.string().min(1, "Selecione um cliente"),
  barbeiroId: z.string().optional(),
  servicoId: z.string().optional(),
  data: z.string().min(1, "Selecione uma data e hora"),
  valor: z.string().min(1, "Informe o valor"),
  desconto: z.string().optional(),
  valorFinal: z.string(),
  observacoes: z.string().optional(),
  couponCode: z.string().optional()
});

type FormValues = z.infer<typeof appointmentSchema>;

export default function AppointmentNewPage() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const preSelectedClient = searchParams.get('client');

  const { data: clients } = useListClients();
  const { data: barbers } = useListBarbers();
  const { data: services } = useListServices();
  
  const createAppointment = useCreateAppointment();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clienteId: preSelectedClient || "",
      barbeiroId: "",
      servicoId: "",
      data: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      valor: "0",
      desconto: "0",
      valorFinal: "0",
      observacoes: "",
      couponCode: ""
    }
  });

  const selectedServiceId = form.watch("servicoId");
  const valor = form.watch("valor");
  const desconto = form.watch("desconto");

  // Auto-update price when service changes
  useEffect(() => {
    if (selectedServiceId && services) {
      const service = services.find(s => s.id.toString() === selectedServiceId);
      if (service) {
        form.setValue("valor", service.valor.toString());
      }
    }
  }, [selectedServiceId, services, form]);

  // Auto-calculate final price
  useEffect(() => {
    const v = parseFloat(valor || "0");
    const d = parseFloat(desconto || "0");
    const final = Math.max(0, v - d);
    form.setValue("valorFinal", final.toString());
  }, [valor, desconto, form]);

  const onSubmit = (data: FormValues) => {
    const payload = {
      clienteId: parseInt(data.clienteId),
      barbeiroId: data.barbeiroId && data.barbeiroId !== "none" ? parseInt(data.barbeiroId) : undefined,
      servicoId: data.servicoId && data.servicoId !== "none" ? parseInt(data.servicoId) : undefined,
      data: new Date(data.data).toISOString(),
      valor: parseFloat(data.valor),
      desconto: data.desconto ? parseFloat(data.desconto) : 0,
      valorFinal: parseFloat(data.valorFinal),
      observacoes: data.observacoes,
      couponCode: data.couponCode || undefined
    };

    createAppointment.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: "Sucesso", description: "Agendamento criado com sucesso." });
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        setLocation("/appointments");
      },
      onError: () => {
        toast({ title: "Erro", description: "Ocorreu um erro ao criar o agendamento.", variant: "destructive" });
      }
    });
  };

  // Sort clients alphabetically for the dropdown
  const sortedClients = useMemo(() => {
    return [...(clients || [])].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [clients]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 md:space-y-6 pb-8">
      <div className="flex items-center gap-3 md:gap-4">
        <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
          <Link href="/appointments">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">Novo Atendimento</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Registre um novo agendamento ou serviço realizado.</p>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Detalhes do Atendimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                
                <FormField
                  control={form.control}
                  name="clienteId"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Cliente *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sortedClients.map(c => (
                            <SelectItem key={c.id} value={c.id.toString()}>{c.nome} - {c.telefone}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data e Hora *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="barbeiroId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barbeiro</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Nenhum específico</SelectItem>
                          {barbers?.map(b => (
                            <SelectItem key={b.id} value={b.id.toString()}>{b.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="servicoId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço Principal</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Serviço personalizado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Outro / Personalizado</SelectItem>
                          {services?.map(s => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.nome} (R$ {s.valor.toFixed(2)})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-secondary/30 rounded-lg border border-border/50">
                  <FormField
                    control={form.control}
                    name="valor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="desconto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Desconto (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="valorFinal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-emerald-500 font-bold">Total Final</FormLabel>
                        <FormControl>
                          <Input type="number" disabled className="bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="couponCode"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Código do Cupom</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: RETORNO15" className="uppercase" {...field} onChange={e => field.onChange(e.target.value.toUpperCase())} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">Se o cliente apresentar um cupom de uma campanha, insira aqui para rastreamento.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Observações do Atendimento</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detalhes do corte, produtos usados, etc." 
                          className="resize-none"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-border/60">
                <Button type="button" variant="outline" asChild>
                  <Link href="/appointments">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={createAppointment.isPending}>
                  {createAppointment.isPending ? "Salvando..." : "Registrar Atendimento"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}