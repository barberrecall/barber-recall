import path from "node:path";
import pg from "pg";
import { readMigrationFiles } from "drizzle-orm/migrator";

/**
 * Marca migrações como já aplicadas, sem executá-las.
 *
 * Necessário uma única vez, na adoção: as tabelas já existiam em produção antes
 * de existir controle de versão de schema, então rodar a migração inicial ali
 * falharia em `CREATE TABLE ... already exists`. O que falta não é criar as
 * tabelas, é registrar que elas correspondem à migração 0000.
 *
 * Usa `readMigrationFiles` do próprio drizzle para calcular o hash, e não uma
 * conta minha em cima do arquivo: se a forma de calcular mudar numa versão
 * futura, isto acompanha em vez de gravar um hash que o migrador não reconhece
 * — o que faria ele tentar recriar tudo.
 *
 * A tabela de controle é criada com o mesmo DDL do migrador, para que a
 * primeira execução real não encontre uma estrutura diferente.
 *
 * Depois desta adoção, este script não deve mais ser usado: migração nova se
 * aplica, não se marca.
 */
export async function baseline(
  connectionString: string,
  ateIncluindo: number,
): Promise<{ marcadas: number; jaRegistradas: number }> {
  const migrations = readMigrationFiles({
    migrationsFolder: path.resolve(import.meta.dirname, "..", "migrations"),
  });

  const alvo = migrations.slice(0, ateIncluindo + 1);
  const client = new pg.Client({ connectionString });
  await client.connect();

  let marcadas = 0;
  let jaRegistradas = 0;

  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      )
    `);

    for (const m of alvo) {
      const { rowCount } = await client.query(
        `SELECT 1 FROM "drizzle"."__drizzle_migrations" WHERE hash = $1`,
        [m.hash],
      );

      if (rowCount && rowCount > 0) {
        jaRegistradas++;
        continue;
      }

      await client.query(
        `INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
        [m.hash, m.folderMillis],
      );
      marcadas++;
    }
  } finally {
    await client.end();
  }

  return { marcadas, jaRegistradas };
}
