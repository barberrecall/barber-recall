import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, copyFile, cp } from "node:fs/promises";

// Plugins (e.g. 'esbuild-plugin-pino') may use `require` to resolve dependencies
globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    // Some packages may not be bundleable, so we externalize them, we can add more here as needed.
    // Some of the packages below may not be imported or installed, but we're adding them in case they are in the future.
    // Examples of unbundleable packages:
    // - uses native modules and loads them dynamically (e.g. sharp)
    // - use path traversal to read files (e.g. @google-cloud/secret-manager loads sibling .proto files)
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    plugins: [
      // pino relies on workers to handle logging, instead of externalizing it we use a plugin to handle it
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    // Make sure packages that are cjs only (e.g. express) but are bundled continue to work in our esm output file
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });

  // O `connect-pg-simple` cria a tabela de sessões lendo um `table.sql` que
  // fica ao lado do próprio índice. Empacotado, `__dirname` passa a ser `dist/`
  // e a leitura falha com ENOENT — mesma armadilha que a lista de `external`
  // acima já descreve para pacotes que atravessam caminho para ler arquivos.
  //
  // Copiar em vez de reescrever o DDL à mão: assim o schema da tabela continua
  // sendo o do próprio pacote, e uma mudança dele não deixa uma cópia nossa
  // desatualizada em silêncio.
  const require_ = createRequire(import.meta.url);
  const origem = path.join(
    path.dirname(require_.resolve("connect-pg-simple")),
    "table.sql",
  );
  await copyFile(origem, path.join(distDir, "table.sql"));

  // Mesma armadilha, outra vítima: `runMigrations` resolve a pasta de migrações
  // a partir de `import.meta.dirname`. No código-fonte isso aponta para
  // lib/db/migrations; empacotado, o índice vive em artifacts/api-server/dist,
  // e o `..` cai em artifacts/api-server. Copiar para lá faz os dois caminhos
  // acertarem o mesmo lugar, sem o módulo precisar saber se está empacotado.
  //
  // Sem isto o servidor sobe, não encontra migração nenhuma, conclui que está
  // tudo aplicado e serve tráfego com o schema errado — falha silenciosa, que é
  // a pior forma desta em particular.
  const migracoesOrigem = path.resolve(artifactDir, "..", "..", "lib", "db", "migrations");
  const migracoesDestino = path.resolve(artifactDir, "migrations");
  await rm(migracoesDestino, { recursive: true, force: true });
  await cp(migracoesOrigem, migracoesDestino, { recursive: true });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
