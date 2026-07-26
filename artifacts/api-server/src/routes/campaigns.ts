import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, campaignsTable, couponsTable, notificationsTable, DIAS_CAMPANHA_PADRAO } from "@workspace/db";

const router: IRouter = Router();

async function fmtCampaign(c: typeof campaignsTable.$inferSelect) {
  let cupomCodigo: string | null = null;
  if (c.cupomId) {
    const [coupon] = await db.select({ codigo: couponsTable.codigo }).from(couponsTable).where(eq(couponsTable.id, c.cupomId));
    cupomCodigo = coupon?.codigo ?? null;
  }
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notificationsTable)
    .where(eq(notificationsTable.campaignId, c.id));

  return {
    id: c.id,
    nome: c.nome,
    tipo: c.tipo,
    dias: c.dias,
    mensagem: c.mensagem,
    cupomId: c.cupomId ?? null,
    cupomCodigo,
    ativo: c.ativo,
    notificacoesEnviadas: Number(count),
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/campaigns", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const rows = await db.select().from(campaignsTable).where(eq(campaignsTable.barbershopId, barbershopId)).orderBy(campaignsTable.createdAt);
  const result = await Promise.all(rows.map(fmtCampaign));
  res.json(result);
});

router.post("/campaigns", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const { nome, tipo, dias, mensagem, cupomId } = req.body;
  if (!nome || !mensagem) { res.status(400).json({ error: "nome and mensagem are required" }); return; }
  try {
  if (cupomId) {
    const [couponOwned] = await db.select({ id: couponsTable.id }).from(couponsTable)
      .where(and(eq(couponsTable.id, cupomId), eq(couponsTable.barbershopId, barbershopId)));
    if (!couponOwned) { res.status(400).json({ error: "Cupom não pertence a esta barbearia." }); return; }
  }
    const [c] = await db.insert(campaignsTable).values({ barbershopId, nome, tipo: tipo ?? "return", dias: dias ?? DIAS_CAMPANHA_PADRAO, mensagem, cupomId: cupomId ?? null }).returning();
    res.status(201).json(await fmtCampaign(c));
  } catch {
    res.status(500).json({ error: "Erro ao criar campanha." });
  }
});

router.patch("/campaigns/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const { nome, tipo, dias, mensagem, cupomId, ativo } = req.body;

  // Desanexar o cupom chega como string vazia; `cupom_id` é integer e o
  // Postgres rejeita ''. Mesmo tratamento aplicado em /clients e /coupons.
  const orNull = (value: unknown) => (value === "" ? null : value);

  const updates: Record<string, unknown> = {};
  if (nome !== undefined) updates.nome = nome;
  if (tipo !== undefined) updates.tipo = tipo;
  if (dias !== undefined) updates.dias = dias;
  if (mensagem !== undefined) updates.mensagem = mensagem;
  if (cupomId !== undefined) updates.cupomId = orNull(cupomId);
  if (ativo !== undefined) updates.ativo = ativo;
  const [c] = await db.update(campaignsTable).set(updates).where(and(eq(campaignsTable.id, id), eq(campaignsTable.barbershopId, barbershopId))).returning();
  if (!c) { res.status(404).json({ error: "not found" }); return; }
  res.json(await fmtCampaign(c));
});

router.delete("/campaigns/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(campaignsTable).where(and(eq(campaignsTable.id, id), eq(campaignsTable.barbershopId, barbershopId)));
  res.sendStatus(204);
});

router.post("/campaigns/:id/toggle", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const [existing] = await db.select().from(campaignsTable).where(and(eq(campaignsTable.id, id), eq(campaignsTable.barbershopId, barbershopId)));
  if (!existing) { res.status(404).json({ error: "not found" }); return; }
  const [c] = await db.update(campaignsTable).set({ ativo: !existing.ativo }).where(eq(campaignsTable.id, id)).returning();
  res.json(await fmtCampaign(c));
});

export default router;
