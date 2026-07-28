import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Scissors, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const BASE_URL = import.meta.env.BASE_URL ?? "/";
const MIN_SENHA = 8;

/**
 * Definição da nova senha, a partir do link recebido por e-mail.
 *
 * O código vem na query string. Ele é lido uma vez e nunca aparece na tela: um
 * print de suporte, uma gravação de reunião ou alguém olhando por cima do ombro
 * não podem carregar a credencial que abre a conta.
 *
 * A confirmação de senha existe porque o campo é mascarado e o erro só
 * apareceria no próximo login — quando a pessoa já teria perdido o link, que é
 * de uso único.
 */
export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  if (!token) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-bold">Link inválido</h1>
          <p className="text-muted-foreground text-sm">
            Este endereço não tem um código de recuperação. Peça um link novo.
          </p>
          <Link href="/esqueci-senha" className="underline text-sm">
            Pedir novo link
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (senha !== confirmacao) {
      setErro("As senhas não conferem.");
      return;
    }
    if (senha.length < MIN_SENHA) {
      setErro(`A senha precisa ter pelo menos ${MIN_SENHA} caracteres.`);
      return;
    }

    setCarregando(true);
    try {
      const res = await fetch(`${BASE_URL}api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha: senha }),
      });

      if (!res.ok) {
        const corpo = (await res.json().catch(() => null)) as { error?: string } | null;
        setErro(corpo?.error ?? "Não foi possível alterar a senha.");
        return;
      }

      setPronto(true);
    } catch {
      setErro("Sem conexão com o servidor. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  };

  if (pronto) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Senha alterada</h1>
          <p className="text-muted-foreground text-sm">
            Entre com a nova senha. Por segurança, todos os aparelhos conectados foram
            desconectados.
          </p>
          <Button className="w-full" onClick={() => navigate("/login")}>
            Ir para o login
          </Button>
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
          <h1 className="text-2xl font-bold">Escolha uma nova senha</h1>
          <p className="text-muted-foreground text-sm">Pelo menos {MIN_SENHA} caracteres.</p>
        </div>

        <Input
          type="password"
          required
          autoComplete="new-password"
          placeholder="Nova senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <Input
          type="password"
          required
          autoComplete="new-password"
          placeholder="Repita a nova senha"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />

        {erro ? <p className="text-sm text-destructive">{erro}</p> : null}

        <Button type="submit" className="w-full" disabled={carregando}>
          {carregando ? "Alterando..." : "Alterar senha"}
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
