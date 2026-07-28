import { defineConfig } from "drizzle-kit";
import path from "path";

// drizzle-kit não lê `.env` sozinho e não aceita a flag `--env-file` do Node,
// então carregamos aqui. `loadEnvFile` é nativo (Node 21+), evitando uma
// dependência só para isto. Variáveis já presentes no ambiente têm prioridade.
if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(path.resolve(__dirname, "..", "..", ".env"));
  } catch {
    // Sem `.env` — o erro abaixo é mais claro que um ENOENT.
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  // drizzle-kit resolves this as a glob pattern, which requires forward
  // slashes even on Windows — path.join alone would emit backslashes here.
  schema: path.join(__dirname, "./src/schema/index.ts").split(path.sep).join("/"),
  // Migrações versionadas ficam aqui e são commitadas. Antes o único caminho de
  // schema era `drizzle-kit push`, que compara com o banco vivo e aplica a
  // diferença na hora: funcionava, mas sem histórico, sem revisão e sem volta.
  //
  // Relativo, ao contrário de `schema` acima: o drizzle-kit trata `out` como
  // relativo ao diretório de trabalho e concatena, então um caminho absoluto
  // vira "C:\...\lib\db\C:\...\lib\db\migrations" e falha com ENOENT.
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
