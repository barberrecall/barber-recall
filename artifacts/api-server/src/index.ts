import app from "./app";
import { runMigrations } from "@workspace/db/migrate";
import { logger } from "./lib/logger";
import { emailConfigurado } from "./lib/email";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

/**
 * A cobrança só funciona inteira com as três variáveis juntas, e a falta de
 * qualquer uma delas se manifesta tarde e de forma confusa: sem APP_URL o
 * Mercado Pago chama um endereço inválido e o pagamento aprovado nunca libera
 * o acesso; sem o segredo, o webhook recusa tudo e o efeito é o mesmo. Nos dois
 * casos o dinheiro entra e o cliente continua bloqueado.
 *
 * Por isso o aviso é aqui, na subida, e não na primeira tentativa de pagamento.
 */
if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
  const faltando = [
    ["APP_URL", process.env.APP_URL],
    ["MERCADOPAGO_WEBHOOK_SECRET", process.env.MERCADOPAGO_WEBHOOK_SECRET],
  ]
    .filter(([, valor]) => !valor)
    .map(([nome]) => nome);

  if (faltando.length > 0) {
    logger.warn(
      { faltando },
      "Mercado Pago configurado pela metade: pagamentos serão cobrados mas o acesso não será liberado",
    );
  }

  if (process.env.APP_URL?.startsWith("http")) {
    logger.warn(
      { appUrl: process.env.APP_URL },
      "APP_URL deve conter apenas o host, sem https:// — o código já monta o esquema",
    );
  }
} else {
  logger.info("MERCADOPAGO_ACCESS_TOKEN ausente: rotas de pagamento inativas");
}

/**
 * Migrações antes de aceitar requisições.
 *
 * O Railway não tem etapa de release separada. Aplicar depois de abrir a porta
 * significaria servir, por alguns segundos, código que espera uma coluna que
 * ainda não existe — e o erro apareceria como 500 para quem estivesse usando,
 * não como falha de deploy.
 *
 * Falhar aqui derruba a subida de propósito: um deploy que não conseguiu migrar
 * não deve receber tráfego. O Railway mantém a versão anterior no ar quando a
 * nova não sobe, então o efeito é o certo — o serviço continua funcionando com o
 * schema que combina com o código que está rodando.
 */
async function iniciar(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required.");
  }

  logger.info("Aplicando migrações pendentes");
  await runMigrations(process.env.DATABASE_URL);
  logger.info("Migrações em dia");

  // Sem provedor de e-mail a recuperação de senha "funciona" — responde
  // sucesso, registra o link no log — e ninguém recebe nada. O aviso existe
  // para isso aparecer na subida, e não quando um cliente ficar sem conta.
  if (!emailConfigurado()) {
    logger.warn(
      "BREVO_API_KEY/EMAIL_REMETENTE ausentes: recuperação de senha não envia e-mail, apenas registra o link no log",
    );
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

iniciar().catch((err: unknown) => {
  logger.error({ err }, "Falha ao iniciar — migração não aplicada, servidor não subiu");
  process.exit(1);
});
