/**
 * Entrada de linha de comando da trava (ver `guard.ts`).
 *
 * Roda antes do `drizzle-kit push` nos scripts do pacote. Fica separada porque
 * o drizzle-kit é um binário próprio: não dá para chamar a trava de dentro
 * dele, só encadear antes.
 */
import { assertDevDatabase } from "./guard";

const action = process.argv[2] ?? "Este comando";

try {
  assertDevDatabase(action);
} catch (error) {
  console.error(`\n${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
