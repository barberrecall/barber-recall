import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Scissors, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const senha = (form.elements.namedItem("password") as HTMLInputElement).value;

    setIsLoading(true);
    try {
      await login(email, senha, rememberMe);
      setLocation("/dashboard");
    } catch (err: unknown) {
      toast({
        title: "Erro ao entrar",
        description: err instanceof Error ? err.message : "Verifique suas credenciais.",
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

        <h1 className="text-3xl font-bold text-foreground mb-2 text-center">Bem-vindo</h1>
        <p className="text-sm text-muted-foreground mb-8 text-center">
          Entre para gerenciar sua barbearia.
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-3">
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
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              required
              autoComplete="current-password"
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

          <div className="flex items-center gap-2 pt-1 pb-1">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(v) => setRememberMe(v === true)}
            />
            <label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer select-none text-muted-foreground">
              Lembrar-me neste dispositivo
            </label>
          </div>

          <Button
            type="submit"
            className="w-full h-14 rounded-2xl text-base font-semibold gap-2"
            disabled={isLoading}
          >
            {isLoading ? "Entrando..." : (
              <>
                Entrar <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        
        <p className="text-xs text-muted-foreground text-center pt-2">
          <a href="/termos" className="underline">Termos</a>
          {" · "}
          <a href="/privacidade" className="underline">Privacidade</a>
        </p>
      </form>

        <p className="mt-8 text-sm text-muted-foreground">
          <div className="text-center mb-3">
          <a href="/esqueci-senha" className="text-sm text-muted-foreground underline">
            Esqueci minha senha
          </a>
        </div>
        Não tem conta?{" "}
          <Link href="/register" className="text-foreground font-semibold hover:text-primary">
            Criar conta
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
