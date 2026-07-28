import { Router, type IRouter, type Request } from "express";
import { eq } from "drizzle-orm";
import {
  MercadoPagoConfig,
  PreApproval,
  Payment as MpPayment,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";
import { db, barbershopTable, paymentNotificationsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "",
});

/**
 * Extrai a mensagem de erro do Mercado Pago.
 *
 * O SDK lança objeto simples, não `Error` — então `err instanceof Error` é
 * falso e o código caía sempre na mensagem genérica. Na prática isso significou
 * responder "Erro ao gerar PIX." quando o servidor sabia que a causa era
 * "payer.email must be a valid email": a informação existia e era descartada
 * na última linha, obrigando a ir no log do servidor para descobrir algo que o
 * usuário podia ter lido na tela.
 *
 * As mensagens do Mercado Pago são de validação de campo e podem ser mostradas
 * — não carregam credencial nem dado de terceiro.
 */
function mensagemDoErro(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;

  if (typeof err === "object" && err !== null) {
    const e = err as { message?: unknown; cause?: unknown };

    if (typeof e.message === "string" && e.message) return e.message;

    // `cause` vem como lista de problemas por campo; a primeira descrição é a
    // acionável.
    if (Array.isArray(e.cause)) {
      const primeira = e.cause.find(
        (c): c is { description: string } =>
          typeof c === "object" && c !== null && typeof (c as { description?: unknown }).description === "string",
      );
      if (primeira) return primeira.description;
    }
  }

  return fallback;
}

const baseUrl = process.env.APP_URL
  ? `https://${process.env.APP_URL}`
  : `https://${process.env.REPLIT_DEV_DOMAIN}`;

// Full public URL for Mercado Pago to POST webhook events
const webhookUrl = `${baseUrl}/api/payment/webhook`;

// POST /payment/create-checkout — requires auth (called from frontend)
router.post("/payment/create-checkout", async (req, res): Promise<void> => {
  if (!req.session?.barbershopId) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }
  try {
    const [shop] = await db.select().from(barbershopTable).where(eq(barbershopTable.id, req.session.barbershopId));
    if (!shop) { res.status(404).json({ error: "Barbearia não encontrada." }); return; }

    const preApproval = new PreApproval(client);
    const result = await preApproval.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: {
        reason: "Barber Recall — Plano Pro",
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: 69.9,
          currency_id: "BRL",
        },
        back_url: `${baseUrl}/dashboard`,
        notification_url: webhookUrl,
        payer_email: shop.email || "pagador@barbearia.com",
        external_reference: String(shop.id),
      } as never,
    });

    res.json({ init_point: result.init_point, preapproval_id: result.id });
  } catch (err: unknown) {
    logger.error({ err }, "Erro ao criar checkout Mercado Pago");
    res.status(500).json({ error: mensagemDoErro(err, "Erro ao criar checkout.") });
  }
});

// POST /payment/create-pix — transparent PIX checkout (returns QR code directly)
router.post("/payment/create-pix", async (req, res): Promise<void> => {
  if (!req.session?.barbershopId) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }
  try {
    const [shop] = await db.select().from(barbershopTable).where(eq(barbershopTable.id, req.session.barbershopId));
    if (!shop) { res.status(404).json({ error: "Barbearia não encontrada." }); return; }

    const paymentClient = new MpPayment(client);
    const result = await paymentClient.create({
      body: {
        transaction_amount: 69.9,
        description: "Barber Recall — Plano Pro (mensal)",
        payment_method_id: "pix",
        payer: { email: shop.email || "pagador@barbearia.com" },
        external_reference: String(shop.id),
        notification_url: webhookUrl,
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      },
    });

    const qrData = result.point_of_interaction?.transaction_data;
    if (!qrData?.qr_code) {
      res.status(502).json({ error: "Mercado Pago não retornou o QR Code. Verifique se a conta possui chave PIX cadastrada." });
      return;
    }

    res.json({
      payment_id: result.id,
      qr_code: qrData.qr_code,
      qr_code_base64: qrData.qr_code_base64 ?? null,
      amount: 69.9,
    });
  } catch (err: unknown) {
    logger.error({ err }, "Erro ao criar PIX Mercado Pago");
    res.status(500).json({ error: mensagemDoErro(err, "Erro ao gerar PIX.") });
  }
});

// GET /payment/pix-status/:paymentId — poll PIX payment status
router.get("/payment/pix-status/:paymentId", async (req, res): Promise<void> => {
  if (!req.session?.barbershopId) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }
  try {
    const paymentId = Array.isArray(req.params.paymentId) ? req.params.paymentId[0] : req.params.paymentId;
    const paymentClient = new MpPayment(client);
    const payment = await paymentClient.get({ id: paymentId });

    // Validate the payment belongs to this barbershop
    if (payment.external_reference !== String(req.session.barbershopId)) {
      res.status(403).json({ error: "Pagamento não pertence a esta barbearia." });
      return;
    }

    res.json({ status: payment.status, statusDetail: payment.status_detail });
  } catch (err: unknown) {
    res.status(500).json({ error: mensagemDoErro(err, "Erro ao consultar status.") });
  }
});

/**
 * Confirma que a notificação veio mesmo do Mercado Pago.
 *
 * O endereço do webhook é público e previsível, e o corpo carrega apenas um id
 * de recurso. Sem esta checagem, qualquer um podia reenviar a notificação de um
 * pagamento aprovado e ganhar mais 30 dias por reenvio.
 *
 * O `dataId` sai da query (`?data.id=`), não do corpo: é o valor que o Mercado
 * Pago usa ao montar o manifesto assinado.
 *
 * Falha fechada quando o segredo não está configurado. A alternativa — aceitar
 * tudo enquanto ninguém configurou — deixaria a brecha aberta exatamente no
 * ambiente onde ela custa dinheiro. O aviso no start (ver index.ts) existe para
 * que isso apareça antes de alguém tentar pagar, e não depois.
 */
const TOLERANCIA_SEGUNDOS = 300;

/**
 * Converte o `ts` da assinatura para milissegundos.
 *
 * O Mercado Pago envia epoch em **segundos**; o `toleranceSeconds` do SDK
 * compara o valor cru com `Date.now()`, que é milissegundos. A conta dá uma
 * deriva de mais de cinquenta anos e a janela reprova sempre — foi o que a
 * notificação simulada mostrou, com `TimestampOutOfTolerance` num servidor cujo
 * relógio estava a três segundos do certo.
 *
 * Aceita as duas unidades em vez de assumir segundos: se o Mercado Pago mudar
 * para milissegundos, ou se o SDK passar a normalizar, isto continua correto.
 * Epoch em segundos tem 10 dígitos até 2286; em milissegundos, 13.
 */
function tsParaMs(ts: string): number {
  const n = Number(ts);
  return ts.length <= 11 ? n * 1000 : n;
}

function webhookAutentico(req: Request): { ok: true } | { ok: false; motivo: string } {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!secret) {
    return { ok: false, motivo: "MERCADOPAGO_WEBHOOK_SECRET não configurada" };
  }

  try {
    // Sem `toleranceSeconds`: aqui o SDK só confere o HMAC, que é a parte que
    // ele faz certo — inclusive a comparação em tempo constante. A janela de
    // tempo é conferida abaixo, com a unidade corrigida.
    WebhookSignatureValidator.validate({
      xSignature: req.headers["x-signature"],
      xRequestId: req.headers["x-request-id"],
      dataId: req.query["data.id"] as string | undefined,
      secret,
    });
  } catch (err) {
    const motivo =
      err instanceof InvalidWebhookSignatureError ? err.reason : "erro inesperado na validação";
    return { ok: false, motivo };
  }

  // Assinatura válida capturada hoje não pode valer para sempre: sem janela de
  // tempo, quem interceptar uma notificação legítima pode reenviá-la meses
  // depois. A idempotência cobre o reenvio da MESMA notificação; a janela cobre
  // o uso tardio de uma assinatura ainda não vista por nós.
  const ts = String(req.headers["x-signature"] ?? "").match(/ts=([^,]+)/)?.[1]?.trim();

  if (!ts) return { ok: false, motivo: "assinatura sem ts" };

  const derivaSegundos = Math.round(Math.abs(Date.now() - tsParaMs(ts)) / 1000);

  if (derivaSegundos > TOLERANCIA_SEGUNDOS) {
    return {
      ok: false,
      motivo: `notificação fora da janela (${derivaSegundos}s de deriva, limite ${TOLERANCIA_SEGUNDOS}s)`,
    };
  }

  return { ok: true };
}

// POST /payment/webhook — public, called by Mercado Pago
router.post("/payment/webhook", async (req, res): Promise<void> => {
  const autentico = webhookAutentico(req);

  if (!autentico.ok) {
    logger.warn(
      { motivo: autentico.motivo, requestId: req.headers["x-request-id"] },
      "Webhook do Mercado Pago recusado",
    );
    // 401, e não 200: aqui não é retentativa do MP que se quer evitar, é
    // requisição que não veio dele.
    res.sendStatus(401);
    return;
  }

  try {
    const { type, data } = req.body as { type?: string; data?: { id?: string } };

    /**
     * Extends the Pro plan by 30 days, always stacking on top of any remaining
     * time. If the plan already expired (or was never set), starts from now.
     * This way early renewals are never penalised.
     */
    /**
     * Registra a notificação e diz se ela é inédita.
     *
     * Grava primeiro e decide pelo resultado, em vez de consultar e depois
     * gravar: o índice único resolve a corrida entre duas entregas simultâneas
     * da mesma notificação, coisa que um "consulta, depois grava" não faz.
     *
     * Vale também para retentativa legítima do próprio Mercado Pago, que
     * acontece quando nossa resposta demora — ela chega com assinatura válida e
     * mesmo assim não pode conceder tempo de novo.
     */
    const registrarSeInedita = async (
      tipo: string,
      externalId: string,
      shopId: number,
    ): Promise<boolean> => {
      const inserido = await db
        .insert(paymentNotificationsTable)
        .values({ tipo, externalId, barbershopId: shopId })
        .onConflictDoNothing()
        .returning({ id: paymentNotificationsTable.id });

      return inserido.length > 0;
    };

    const computeNewExpiry = async (shopId: number): Promise<Date> => {
      const [shop] = await db
        .select({ planExpiresAt: barbershopTable.planExpiresAt })
        .from(barbershopTable)
        .where(eq(barbershopTable.id, shopId));
      const base =
        shop?.planExpiresAt && shop.planExpiresAt > new Date()
          ? shop.planExpiresAt
          : new Date();
      return new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
    };

    if (type === "subscription_preapproval") {
      const preApproval = new PreApproval(client);
      const subscription = await preApproval.get({ id: data?.id ?? "" });
      const shopId = subscription.external_reference
        ? parseInt(subscription.external_reference, 10)
        : null;

      if (shopId && subscription.status === "authorized") {
        const inedita = await registrarSeInedita(type, String(subscription.id), shopId);
        if (inedita) {
          const planExpiresAt = await computeNewExpiry(shopId);
          await db
            .update(barbershopTable)
            .set({ plan: "pro", planExpiresAt })
            .where(eq(barbershopTable.id, shopId));
        } else {
          logger.info({ preapprovalId: subscription.id, shopId }, "Assinatura já processada, ignorando");
        }
      }
    }

    if (type === "payment") {
      const paymentClient = new MpPayment(client);
      const payment = await paymentClient.get({ id: data?.id ?? "" });
      if (payment.status === "approved" && payment.external_reference) {
        const shopId = parseInt(payment.external_reference, 10);
        if (!isNaN(shopId)) {
          const inedita = await registrarSeInedita(type, String(payment.id), shopId);
          if (inedita) {
            const planExpiresAt = await computeNewExpiry(shopId);
            await db
              .update(barbershopTable)
              .set({ plan: "pro", planExpiresAt })
              .where(eq(barbershopTable.id, shopId));
          } else {
            logger.info({ paymentId: payment.id, shopId }, "Pagamento já processado, ignorando");
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    // Always 200 to prevent MP retries on internal errors, but log so we can debug
    logger.error({ err }, "Erro ao processar webhook Mercado Pago");
    res.sendStatus(200);
  }
});

export default router;
