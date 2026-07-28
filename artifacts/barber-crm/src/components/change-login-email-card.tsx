import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { KeyRound, Save } from "lucide-react";
import { useChangeLoginEmail } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

/**
 * Troca do e-mail de LOGIN.
 *
 * Vive numa seção separada, e não junto dos dados da barbearia, porque são
 * coisas diferentes que já foram confundidas na prática: o e-mail da barbearia
 * vai para as cobranças, este é o que faz você entrar. Misturar os dois no mesmo
 * formulário foi exatamente o que levou alguém a trocar um achando que trocava o
 * outro e ficar sem conseguir acessar.
 *
 * A senha atual é obrigatória. Não é burocracia: trocar o e-mail de login é o
 * passo final de um roubo de conta — com uma sessão emprestada, um navegador
 * esquecido aberto, seria possível trocar o e-mail, pedir "esqueci a senha" e
 * assumir a conta sem nunca ter sabido a senha original.
 */

const schema = z.object({
  novoEmail: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Digite sua senha atual"),
});

type FormValues = z.infer<typeof schema>;

export function ChangeLoginEmailCard() {
  const { user } = useAuth();
  // O contexto de auth carrega o usuário uma vez, na montagem, e não tem
  // refresh. Em vez de recarregar a página inteira depois de salvar, guardamos
  // o e-mail que o servidor devolveu — é a fonte mais recente que existe aqui.
  const [emailAtual, setEmailAtual] = useState<string | null>(null);
  const changeEmail = useChangeLoginEmail();
  const { toast } = useToast();
  const [erro, setErro] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { novoEmail: "", senha: "" },
  });

  const onSubmit = (values: FormValues) => {
    setErro(null);
    changeEmail.mutate(
      { data: values },
      {
        onSuccess: (atualizado) => {
          setEmailAtual(atualizado.email);
          // A senha some do formulário no sucesso; deixá-la preenchida convida a
          // ficar visível numa tela que ninguém mais está olhando.
          form.reset({ novoEmail: "", senha: "" });
          toast({
            title: "E-mail de login atualizado",
            description: "Use o novo endereço na próxima vez que entrar.",
          });
        },
        onError: (e: unknown) => {
          // A mensagem do servidor distingue "senha incorreta" de "e-mail já em
          // uso", e as duas pedem ações diferentes de quem está na tela.
          const msg = e instanceof Error ? e.message : "Não foi possível trocar o e-mail.";
          setErro(msg);
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Conta
        </CardTitle>
        <CardDescription>
          O e-mail que você usa para entrar no sistema.
          {emailAtual ?? user?.email ? (
            <>
              {" "}
              Hoje é <strong>{emailAtual ?? user?.email}</strong>.
            </>
          ) : null}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="novoEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novo e-mail de login</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="senha"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sua senha atual</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Pedimos a senha para impedir que alguém com seu computador aberto troque o
                    e-mail e assuma a conta.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

            <Button type="submit" disabled={changeEmail.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {changeEmail.isPending ? "Trocando..." : "Trocar e-mail de login"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
