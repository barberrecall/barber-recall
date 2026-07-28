import app from "./app";
import { logger } from "./lib/logger";

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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
