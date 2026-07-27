/**
 * Entrada de linha de comando da trava (ver `guard.ts`).
 *
 * Roda antes do `drizzle-kit push` nos scripts do pacote. Fica separada porque
 * o drizzle-kit é um binário próprio: não dá para chamar a trava de dentro
 * dele, só encadear antes.
 */
import path from "node:path";
import { assertDevDatabase } from "./guard";

// Nada lê `.env` sozinho aqui, e sem isto a trava acusaria "DATABASE_URL não
// está definida" justamente no caso normal — rodar `db push` na máquina de quem
// tem tudo configurado.
//
// O carregamento é incondicional de propósito. Fazê-lo só quando falta
// DATABASE_URL deixava DEV_DB_HOST de fora sempre que alguém passasse a URL na
// linha de comando: a trava até bloqueava, mas alegando que DEV_DB_HOST não
// existe quando ela existe — mensagem que manda investigar o lugar errado.
// `loadEnvFile` não sobrescreve variável já presente no ambiente (verificado),
// então quem passa DATABASE_URL na mão continua mandando.
//
// `guard.ts` continua sem tocar em arquivo: recebe o ambiente e decide. Quem
// monta o ambiente é esta entrada, que é onde a decisão de ler `.env` cabe.
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, "..", "..", "..", ".env"));
} catch {
  // Sem `.env` — a mensagem da trava é mais clara que um ENOENT.
}

const action = process.argv[2] ?? "Este comando";

try {
  assertDevDatabase(action);
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
