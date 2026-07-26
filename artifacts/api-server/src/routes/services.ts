import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";

const router: IRouter = Router();

const fmt = (s: typeof servicesTable.$inferSelect) => ({
  id: s.id,
  nome: s.nome,
  valor: parseFloat(s.valor),
  duracao: s.duracao,
  ativo: s.ativo,
});

router.get("/services", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const rows = await db.select().from(servicesTable).where(eq(servicesTable.barbershopId, barbershopId)).orderBy(servicesTable.nome);
  res.json(rows.map(fmt));
});

router.post("/services", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const { nome, valor, duracao } = req.body;
  if (!nome || valor === undefined) { res.status(400).json({ error: "nome and valor are required" }); return; }
  const [s] = await db.insert(servicesTable).values({ barbershopId, nome, valor: String(valor), duracao: duracao ?? 30 }).returning();
  res.status(201).json(fmt(s));
});

router.patch("/services/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const { nome, valor, duracao, ativo } = req.body;
  const updates: Record<string, unknown> = {};
  if (nome !== undefined) updates.nome = nome;
  if (valor !== undefined) updates.valor = String(valor);
  if (duracao !== undefined) updates.duracao = duracao;
  if (ativo !== undefined) updates.ativo = ativo;
  const [s] = await db.update(servicesTable).set(updates).where(and(eq(servicesTable.id, id), eq(servicesTable.barbershopId, barbershopId))).returning();
  if (!s) { res.status(404).json({ error: "not found" }); return; }
  res.json(fmt(s));
});

router.delete("/services/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(servicesTable).where(and(eq(servicesTable.id, id), eq(servicesTable.barbershopId, barbershopId)));
  res.sendStatus(204);
});

export default router;
