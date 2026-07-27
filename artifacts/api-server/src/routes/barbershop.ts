import { Router, type IRouter } from "express";
import { requiredNumber } from "../lib/coerce";
import { eq } from "drizzle-orm";
import { db, barbershopTable } from "@workspace/db";
import { computeTrialStatus } from "../lib/trial";

const router: IRouter = Router();

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
