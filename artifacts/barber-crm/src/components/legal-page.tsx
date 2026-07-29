import { Link } from "wouter";
import { ArrowLeft, Scissors } from "lucide-react";

/**
 * Moldura das páginas jurídicas.
 *
 * São públicas de propósito: a Apple exige uma URL de política de privacidade
 * acessível sem login para aprovar o app, e a LGPD exige que o titular consiga
 * ler como seus dados são tratados antes de entregar qualquer um deles.
 */
export function LegalPage({
  titulo,
  atualizadoEm,
  children,
}: {
  titulo: string;
  atualizadoEm: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Scissors className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold">Barber Recall</span>
          <Link href="/login" className="ml-auto inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Entrar
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-20">
        <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
        <p className="text-sm text-muted-foreground mt-1">Última atualização: {atualizadoEm}</p>

        {/*
          `prose` não está disponível neste projeto (não há @tailwindcss/typography),
          então o espaçamento vem de regras diretas nos filhos. Menos elegante que
          uma classe utilitária, mas não adiciona dependência a um documento que
          é essencialmente texto estático.
        */}
        <div
          className="mt-8 space-y-4 text-sm leading-relaxed
            [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:tracking-tight
            [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-1
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1
            [&_table]:w-full [&_table]:text-left [&_table]:border-collapse
            [&_th]:border-b [&_th]:border-border [&_th]:py-2 [&_th]:pr-4 [&_th]:font-semibold
            [&_td]:border-b [&_td]:border-border/50 [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top"
        >
          {children}
        </div>

        <footer className="mt-12 pt-6 border-t border-border text-sm text-muted-foreground flex flex-wrap gap-4">
          <Link href="/privacidade" className="underline">Política de Privacidade</Link>
          <Link href="/termos" className="underline">Termos de Uso</Link>
          <Link href="/login" className="underline">Entrar</Link>
        </footer>
      </main>
    </div>
  );
}

/**
 * Marca um dado que precisa ser preenchido antes de publicar.
 *
 * Visível de propósito, e não um comentário no código: um `[PREENCHER]`
 * discreto no meio do texto passa despercebido e vai para produção. Este grita.
 */
export function Preencher({ children }: { children: React.ReactNode }) {
  return (
    <mark className="bg-yellow-200 text-yellow-950 px-1 rounded font-medium">
      [PREENCHER: {children}]
    </mark>
  );
}
