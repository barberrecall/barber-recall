import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

/**
 * Aplica as migrações pendentes.
 *
 * Roda na subida do servidor, antes de aceitar requisições (ver
 * artifacts/api-server/src/index.ts). O Railway não tem etapa de release
 * separada, e deixar para depois significaria servir código que espera uma
 * coluna que ainda não existe.
 *
 * Usa conexão própria e a fecha no fim, em vez do pool compartilhado de
 * `index.ts`: migração acontece uma vez e não deveria segurar conexão do pool
 * pelo resto da vida do processo.
 *
 * O drizzle registra o que já aplicou em `drizzle.__drizzle_migrations` e roda
 * cada arquivo em transação. Com mais de uma instância subindo ao mesmo tempo
 * haveria corrida — hoje é uma só; se um dia escalar, isto precisa virar etapa
 * separada do start.
 */
export async function runMigrations(connectionString: string): Promise<void> {
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await migrate(drizzle(client), {
      migrationsFolder: path.resolve(import.meta.dirname, "..", "migrations"),
    });
  } finally {
    await client.end();
  }
}
