import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { MercadoPagoConfig, PreApproval, Payment as MpPayment } from "mercadopago";
import { db, barbershopTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN ?? "",
});

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
    const message = err instanceof Error ? err.message : "Erro ao criar checkout.";
    res.status(500).json({ error: message });
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
    const message = err instanceof Error ? err.message : "Erro ao gerar PIX.";
    res.status(500).json({ error: message });
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
    const message = err instanceof Error ? err.message : "Erro ao consultar status.";
    res.status(500).json({ error: message });
  }
});

// POST /payment/webhook — public, called by Mercado Pago
router.post("/payment/webhook", async (req, res): Promise<void> => {
  try {
    const { type, data } = req.body as { type?: string; data?: { id?: string } };

    /**
     * Extends the Pro plan by 30 days, always stacking on top of any remaining
     * time. If the plan already expired (or was never set), starts from now.
     * This way early renewals are never penalised.
     */
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
        const planExpiresAt = await computeNewExpiry(shopId);
        await db
          .update(barbershopTable)
          .set({ plan: "pro", planExpiresAt })
          .where(eq(barbershopTable.id, shopId));
      }
    }

    if (type === "payment") {
      const paymentClient = new MpPayment(client);
      const payment = await paymentClient.get({ id: data?.id ?? "" });
      if (payment.status === "approved" && payment.external_reference) {
        const shopId = parseInt(payment.external_reference, 10);
        if (!isNaN(shopId)) {
          const planExpiresAt = await computeNewExpiry(shopId);
          await db
            .update(barbershopTable)
            .set({ plan: "pro", planExpiresAt })
            .where(eq(barbershopTable.id, shopId));
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
