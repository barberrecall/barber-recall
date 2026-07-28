/**
 * Verifica as duas proteções do webhook de pagamento.
 *
 * O endereço é público e o corpo carrega só um id. Antes desta dupla, reenviar
 * a notificação de um pagamento aprovado rendia mais 30 dias de plano por
 * reenvio — uma cobrança de R$ 69,90 podia virar anos de acesso.
 *
 *   porta da frente  assinatura HMAC do Mercado Pago, com janela de tempo
 *   porta de trás    índice único: a mesma notificação nunca concede duas vezes
 *
 * O que este teste NÃO cobre: a concessão em si, porque o handler consulta o
 * pagamento no Mercado Pago e isso exigiria credencial real e uma cobrança de
 * verdade. O que dá para afirmar é onde a requisição para — 401 significa
 * barrada na porta, qualquer outra coisa significa que passou por ela.
 *
 * Uso: SERVER_SECRET precisa ser o mesmo MERCADOPAGO_WEBHOOK_SECRET com que o
 * servidor sob teste subiu, senão o caso de assinatura válida falha por motivo
 * errado.
 */
import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { db, paymentNotificationsTable } from "@workspace/db";
import { assertDevDatabase } from "@workspace/db/guard";

const BASE = process.env.API_URL ?? "http://localhost:8080";
const SECRET = process.env.SERVER_SECRET ?? "segredo-de-teste";

/** Mesmo manifesto que o SDK do Mercado Pago assina. */
function assinar(dataId: string, requestId: string, ts: string): string {
  const manifesto = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return createHmac("sha256", SECRET).update(manifesto).digest("hex");
}

async function chamar(
  dataId: string,
  headers: Record<string, string>,
): Promise<number> {
  const res = await fetch(`${BASE}/api/payment/webhook?data.id=${dataId}&type=payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ type: "payment", data: { id: dataId } }),
  });
  return res.status;
}

let falhas = 0;

function conferir(nome: string, real: unknown, esperado: unknown): void {
  const ok = real === esperado;
  if (!ok) falhas++;
  console.log(`  ${ok ? "ok  " : "FALHA"}  ${nome}  (obtido ${String(real)}, esperado ${String(esperado)})`);
}

async function main(): Promise<void> {
  assertDevDatabase("check:webhook");

  console.log(`API: ${BASE}\n`);
  console.log("porta da frente — assinatura:");

  const dataId = "123456789";
  const requestId = "req-teste-1";
  const ts = String(Date.now());

  conferir("sem cabeçalho de assinatura", await chamar(dataId, {}), 401);

  conferir(
    "assinatura forjada",
    await chamar(dataId, {
      "x-signature": `ts=${ts},v1=${"0".repeat(64)}`,
      "x-request-id": requestId,
    }),
    401,
  );

  conferir(
    "assinatura válida mas de outro id (troca de recurso)",
    await chamar("999", {
      "x-signature": `ts=${ts},v1=${assinar(dataId, requestId, ts)}`,
      "x-request-id": requestId,
    }),
    401,
  );

  const tsVelho = String(Date.now() - 10 * 60 * 1000); // 10 min > tolerância de 5
  conferir(
    "assinatura válida porém antiga (replay tardio)",
    await chamar(dataId, {
      "x-signature": `ts=${tsVelho},v1=${assinar(dataId, requestId, tsVelho)}`,
      "x-request-id": requestId,
    }),
    401,
  );

  const statusValido = await chamar(dataId, {
    "x-signature": `ts=${ts},v1=${assinar(dataId, requestId, ts)}`,
    "x-request-id": requestId,
  });
  const passou = statusValido !== 401;
  if (!passou) falhas++;
  console.log(
    `  ${passou ? "ok  " : "FALHA"}  assinatura legítima em ms passa  (obtido ${statusValido}, esperado ≠ 401)`,
  );

  /*
   * O Mercado Pago envia `ts` em segundos, não em milissegundos. O
   * `toleranceSeconds` do SDK compara o valor cru com Date.now(), o que dá uma
   * deriva de mais de cinquenta anos e reprova toda notificação real — a
   * proteção teria bloqueado 100% dos pagamentos, e nenhum teste sintético
   * pegou isso porque todos assinavam em milissegundos.
   *
   * Este caso existe para que a unidade volte a ser exercitada, e não só a
   * conveniente.
   */
  const tsSegundos = String(Math.floor(Date.now() / 1000));
  const statusSegundos = await chamar(dataId, {
    "x-signature": `ts=${tsSegundos},v1=${assinar(dataId, requestId, tsSegundos)}`,
    "x-request-id": requestId,
  });
  const passouSegundos = statusSegundos !== 401;
  if (!passouSegundos) falhas++;
  console.log(
    `  ${passouSegundos ? "ok  " : "FALHA"}  assinatura legítima em SEGUNDOS passa  (obtido ${statusSegundos}, esperado ≠ 401)`,
  );

  const tsSegundosVelho = String(Math.floor(Date.now() / 1000) - 600);
  conferir(
    "em segundos, porém antiga (replay tardio)",
    await chamar(dataId, {
      "x-signature": `ts=${tsSegundosVelho},v1=${assinar(dataId, requestId, tsSegundosVelho)}`,
      "x-request-id": requestId,
    }),
    401,
  );

  console.log("\nporta de trás — idempotência:");

  const idTeste = `teste-${Date.now()}`;
  const gravar = async (): Promise<number> => {
    const r = await db
      .insert(paymentNotificationsTable)
      .values({ tipo: "payment", externalId: idTeste, barbershopId: null })
      .onConflictDoNothing()
      .returning({ id: paymentNotificationsTable.id });
    return r.length;
  };

  conferir("primeira notificação é inédita", await gravar(), 1);
  conferir("mesma notificação repetida não concede", await gravar(), 0);

  await db.execute(sql`delete from ${paymentNotificationsTable} where external_id = ${idTeste}`);

  console.log(falhas === 0 ? "\nOK: as duas portas fecham." : `\n${falhas} verificação(ões) falharam.`);
  process.exit(falhas === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
