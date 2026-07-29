import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Scissors, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nomeDono = (form.elements.namedItem("nome") as HTMLInputElement).value.trim();
    const nomeBarbearia = (form.elements.namedItem("barbearia") as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const senha = (form.elements.namedItem("senha") as HTMLInputElement).value;
    const confirmar = (form.elements.namedItem("confirmar") as HTMLInputElement).value;

    if (senha !== confirmar) {
      toast({ title: "Senhas não conferem", description: "Confirme a senha corretamente.", variant: "destructive" });
      return;
    }
    if (senha.length < 6) {
      toast({ title: "Senha fraca", description: "A senha deve ter pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      await register({ email, senha, nomeDono, nomeBarbearia });
      toast({
        title: `Conta criada com sucesso, ${nomeDono}!`,
        description: "Bem-vindo ao Barber Recall. Seu período de teste de 3 dias começou.",
      });
      setLocation("/dashboard");
    } catch (err: unknown) {
      toast({
        title: "Erro ao criar conta",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm flex flex-col items-center"
      >
        <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
          <Scissors className="h-8 w-8 text-primary-foreground" strokeWidth={2.25} />
        </div>
        <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-8">
          Barber Recall
        </p>

        <h1 className="text-3xl font-bold text-foreground mb-2 text-center">Criar conta</h1>
        <p className="text-sm text-muted-foreground mb-8 text-center">
          3 dias grátis. Sem cartão de crédito.
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <Input
            id="nome"
            name="nome"
            type="text"
            placeholder="Seu nome"
            required
            autoComplete="name"
            className="h-14 rounded-2xl border-0 bg-secondary px-5 text-base placeholder:text-muted-foreground"
          />
          <Input
            id="barbearia"
            name="barbearia"
            type="text"
            placeholder="Nome da barbearia"
            required
            autoComplete="organization"
            className="h-14 rounded-2xl border-0 bg-secondary px-5 text-base placeholder:text-muted-foreground"
          />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            required
            autoComplete="email"
            className="h-14 rounded-2xl border-0 bg-secondary px-5 text-base placeholder:text-muted-foreground"
          />
          <div className="relative">
            <Input
              id="senha"
              name="senha"
              type={showPassword ? "text" : "password"}
              placeholder="Senha (mínimo 6 caracteres)"
              required
              minLength={6}
              autoComplete="new-password"
              className="h-14 rounded-2xl border-0 bg-secondary px-5 pr-12 text-base placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <Input
            id="confirmar"
            name="confirmar"
            type={showPassword ? "text" : "password"}
            placeholder="Confirmar senha"
            required
            autoComplete="new-password"
            className="h-14 rounded-2xl border-0 bg-secondary px-5 text-base placeholder:text-muted-foreground"
          />

          <Button
            type="submit"
            className="w-full h-14 rounded-2xl text-base font-semibold gap-2 mt-2"
            disabled={isLoading}
          >
            {isLoading ? "Criando conta..." : (
              <>
                Começar teste grátis <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground pt-1">
            Ao criar uma conta, você concorda com os nossos{" "}
            <span className="text-primary cursor-pointer hover:underline">Termos de Uso</span>.
          </p>
        
        {/*
          No cadastro, e não escondido num menu: é aqui que a pessoa entrega os
          dados, e é aqui que ela precisa conseguir ler o que aceita.
        */}
        <p className="text-xs text-muted-foreground text-center">
          Ao criar a conta você concorda com os{" "}
          <a href="/termos" className="underline">Termos de Uso</a> e a{" "}
          <a href="/privacidade" className="underline">Política de Privacidade</a>.
        </p>
      </form>

        <p className="mt-8 text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link href="/login" className="text-foreground font-semibold hover:text-primary">
            Entrar
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
