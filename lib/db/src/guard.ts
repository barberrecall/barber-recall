/**
 * Trava que impede um comando destrutivo de rodar contra o banco de produção.
 *
 * O projeto não tem migrações versionadas: o único caminho de schema é
 * `drizzle-kit push`, que compara o schema em TypeScript com o banco vivo e
 * aplica a diferença na hora — e `push-force` chega a derrubar colunas. Com a
 * URL errada no `.env`, um `push` de rotina reescreve produção sem revisão e
 * sem histórico.
 *
 * ── Por que a trava é por allowlist, e não por denylist ─────────────────────
 *
 * Bloquear "o host de produção" só protege contra o host que alguém lembrou de
 * listar. No dia em que existir um segundo banco de produção — uma réplica, um
 * ambiente de homologação que virou real — a lista antiga passa a liberar o que
 * deveria barrar, silenciosamente.
 *
 * Então o padrão é recusar: o comando só roda se o host atual for exatamente o
 * `DEV_DB_HOST` declarado. Sem `DEV_DB_HOST`, nada roda. Isso custa uma linha
 * de configuração uma vez, e falha para o lado seguro para sempre.
 *
 * A saída de emergência é `ALLOW_PROD_DB=1`, explícita e barulhenta — existe
 * porque uma hora alguém precisa mesmo aplicar schema em produção, e o
 * caminho para isso deve ser consciente, não acidental.
 */

/** Extrai só o host, para nunca imprimir a senha da connection string. */
function hostOf(connectionString: string): string {
  try {
    return new URL(connectionString).host;
  } catch {
    throw new Error(
      "DATABASE_URL não é uma URL válida — não dá para saber contra qual banco este comando rodaria.",
    );
  }
}

/**
 * Interrompe o processo se o `DATABASE_URL` atual não for o banco de
 * desenvolvimento declarado.
 *
 * @param action - o que seria feito, para a mensagem dizer o que foi barrado.
 */
export function assertDevDatabase(action: string): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não está definida.");
  }

  const atual = hostOf(url);

  if (process.env.ALLOW_PROD_DB === "1") {
    // stderr de propósito: quem redireciona stdout para um log ainda vê isto.
    console.error(
      `\n  !!  ALLOW_PROD_DB=1 — ${action} vai rodar contra ${atual} sem verificação.\n`,
    );
    return;
  }

  const dev = process.env.DEV_DB_HOST;

  if (!dev) {
    throw new Error(
      `${action} foi bloqueado: DEV_DB_HOST não está definida.\n\n` +
        `  Este comando altera dados ou schema, e o banco atual é ${atual}.\n` +
        `  Sem saber qual é o banco de desenvolvimento, a trava recusa por padrão.\n\n` +
        `  Crie um branch de desenvolvimento no Neon e declare o host dele no .env:\n` +
        `    DEV_DB_HOST=ep-seu-branch-dev.us-east-2.aws.neon.tech\n\n` +
        `  Para rodar contra produção mesmo assim: ALLOW_PROD_DB=1`,
    );
  }

  if (atual !== dev) {
    throw new Error(
      `${action} foi bloqueado: o banco atual não é o de desenvolvimento.\n\n` +
        `    DATABASE_URL aponta para  ${atual}\n` +
        `    DEV_DB_HOST declara       ${dev}\n\n` +
        `  Para rodar contra produção mesmo assim: ALLOW_PROD_DB=1`,
    );
  }
}
