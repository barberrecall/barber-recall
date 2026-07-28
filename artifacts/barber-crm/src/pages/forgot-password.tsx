import { useState } from "react";
import { Link } from "wouter";
import { Scissors, ArrowLeft, MailCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

/**
 * Pedido de recuperação de senha.
 *
 * A tela mostra a **mesma confirmação** exista o e-mail ou não. Não é
 * imprecisão: distinguir os dois casos transformaria esta página num
 * verificador de contas — qualquer pessoa descobriria quais barbearias usam o
 * sistema testando endereços. O servidor responde igual pela mesma razão.
 *
 * O custo é real e assumido: quem digitar o e-mail errado vai esperar por um
 * e-mail que nunca chega. Por isso a confirmação repete o endereço digitado, e
 * oferece tentar de novo — é o que reduz o dano sem abrir a informação.
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    try {
      await fetch(`${BASE_URL}api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Falha de rede não muda a tela: a confirmação é sempre a mesma, e
      // mostrar erro aqui revelaria mais do que a resposta do servidor revela.
    } finally {
      setCarregando(false);
      setEnviado(true);
    }
  };

  if (enviado) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MailCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Verifique seu e-mail</h1>
          <p className="text-muted-foreground text-sm">
            Se <strong>{email}</strong> estiver cadastrado, enviamos um link para você escolher uma
            nova senha. O link vale por 1 hora.
          </p>
          <p className="text-muted-foreground text-xs">
            Não chegou? Confira a caixa de spam, ou{" "}
            <button
              type="button"
              className="underline"
              onClick={() => {
                setEnviado(false);
                setEmail("");
              }}
            >
              tente com outro endereço
            </button>
            .
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 text-sm mt-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary flex items-center justify-center">
            <Scissors className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Recuperar senha</h1>
          <p className="text-muted-foreground text-sm">
            Digite o e-mail que você usa para entrar. Enviaremos um link para escolher uma nova
            senha.
          </p>
        </div>

        <Input
          type="email"
          required
          autoComplete="username"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button type="submit" className="w-full" disabled={carregando}>
          {carregando ? "Enviando..." : "Enviar link de recuperação"}
        </Button>

        <div className="text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Link>
        </div>
      </form>
    </div>
  );
}
