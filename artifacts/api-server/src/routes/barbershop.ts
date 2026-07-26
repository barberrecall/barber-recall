import { Router, type IRouter } from "express";
import { requiredNumber } from "../lib/coerce";
import { eq } from "drizzle-orm";
import { db, barbershopTable } from "@workspace/db";

const router: IRouter = Router();

const TRIAL_DAYS = 3;

function computeTrialStatus(shop: typeof barbershopTable.$inferSelect) {
  const plan = shop.plan as "free" | "pro";

  if (plan === "pro") {
    // Check if the paid plan has expired
    if (shop.planExpiresAt) {
      const expired = new Date(shop.planExpiresAt) < new Date();
      if (expired) {
        // Plan expired — treat as free/trial expired
        return {
          plan: "free" as const,
          trialActive: false,
          trialExpired: true,
          daysRemaining: null,
          planExpiresAt: shop.planExpiresAt.toISOString(),
        };
      }
      const msLeft = new Date(shop.planExpiresAt).getTime() - Date.now();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      return {
        plan,
        trialActive: false,
        trialExpired: false,
        daysRemaining: daysLeft,
        planExpiresAt: shop.planExpiresAt.toISOString(),
      };
    }
    // Pro with no expiry = legacy/card-recurring subscriber
    return {
      plan,
      trialActive: false,
      trialExpired: false,
      daysRemaining: null,
      planExpiresAt: null,
    };
  }

  // Free plan — evaluate trial window
  const msElapsed = Date.now() - new Date(shop.trialStartsAt).getTime();
  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
  const daysRemaining = Math.max(0, Math.ceil(TRIAL_DAYS - daysElapsed));
  const trialExpired = daysElapsed >= TRIAL_DAYS;
  return {
    plan,
    trialActive: !trialExpired,
    trialExpired,
    daysRemaining,
    planExpiresAt: null,
  };
}

router.get("/barbershop", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const [shop] = await db.select().from(barbershopTable).where(eq(barbershopTable.id, barbershopId));
  if (!shop) { res.status(404).json({ error: "Barbearia não encontrada." }); return; }
  const trial = computeTrialStatus(shop);
  res.json({
    id: shop.id,
    nome: shop.nome,
    telefone: shop.telefone,
    email: shop.email,
    cidade: shop.cidade,
    logo: shop.logo ?? null,
    corPrimaria: shop.corPrimaria,
    corSecundaria: shop.corSecundaria ?? null,
    whatsapp: shop.whatsapp ?? null,
    instagram: shop.instagram ?? null,
    mensagemPadrao: shop.mensagemPadrao ?? null,
    diasRetorno: shop.diasRetorno,
    createdAt: shop.createdAt.toISOString(),
    trialStartsAt: shop.trialStartsAt.toISOString(),
    ...trial,
  });
});

router.patch("/barbershop", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const { nome, telefone, email, cidade, logo, corPrimaria, corSecundaria, whatsapp, instagram, mensagemPadrao, diasRetorno } = req.body;
  const updates: Record<string, unknown> = {};
  if (nome !== undefined) updates.nome = nome;
  if (telefone !== undefined) updates.telefone = telefone;
  if (email !== undefined) updates.email = email;
  if (cidade !== undefined) updates.cidade = cidade;
  if (logo !== undefined) updates.logo = logo;
  if (corPrimaria !== undefined) updates.corPrimaria = corPrimaria;
  if (corSecundaria !== undefined) updates.corSecundaria = corSecundaria;
  if (whatsapp !== undefined) updates.whatsapp = whatsapp;
  if (instagram !== undefined) updates.instagram = instagram;
  if (mensagemPadrao !== undefined) updates.mensagemPadrao = mensagemPadrao;
  // `dias_retorno` é integer NOT NULL e governa todo o cálculo de recall: um
  // valor inválido aqui reclassificaria os clientes de forma silenciosa.
  const diasErrors: string[] = [];
  const diasRetornoNum = requiredNumber(diasRetorno, "diasRetorno", diasErrors, {
    integer: true,
    min: 1,
  });
  if (diasErrors.length > 0) {
    res.status(400).json({ error: diasErrors.join(" ") });
    return;
  }
  if (diasRetornoNum !== undefined) updates.diasRetorno = diasRetornoNum;

  const [updated] = await db
    .update(barbershopTable)
    .set(updates)
    .where(eq(barbershopTable.id, barbershopId))
    .returning();

  const trial = computeTrialStatus(updated);
  res.json({
    id: updated.id,
    nome: updated.nome,
    telefone: updated.telefone,
    email: updated.email,
    cidade: updated.cidade,
    logo: updated.logo ?? null,
    corPrimaria: updated.corPrimaria,
    corSecundaria: updated.corSecundaria ?? null,
    whatsapp: updated.whatsapp ?? null,
    instagram: updated.instagram ?? null,
    mensagemPadrao: updated.mensagemPadrao ?? null,
    diasRetorno: updated.diasRetorno,
    createdAt: updated.createdAt.toISOString(),
    trialStartsAt: updated.trialStartsAt.toISOString(),
    ...trial,
  });
});

export default router;
