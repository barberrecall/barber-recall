import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, barbersTable } from "@workspace/db";

const router: IRouter = Router();

const fmt = (b: typeof barbersTable.$inferSelect) => ({
  id: b.id,
  nome: b.nome,
  telefone: b.telefone ?? null,
  ativo: b.ativo,
  foto: b.foto ?? null,
  createdAt: b.createdAt.toISOString(),
});

router.get("/barbers", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const rows = await db.select().from(barbersTable).where(eq(barbersTable.barbershopId, barbershopId)).orderBy(barbersTable.nome);
  res.json(rows.map(fmt));
});

router.post("/barbers", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const { nome, telefone, foto } = req.body;
  if (!nome) { res.status(400).json({ error: "nome is required" }); return; }
  const [b] = await db.insert(barbersTable).values({ barbershopId, nome, telefone, foto }).returning();
  res.status(201).json(fmt(b));
});

router.patch("/barbers/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const { nome, telefone, ativo, foto } = req.body;
  const updates: Record<string, unknown> = {};
  if (nome !== undefined) updates.nome = nome;
  if (telefone !== undefined) updates.telefone = telefone;
  if (ativo !== undefined) updates.ativo = ativo;
  if (foto !== undefined) updates.foto = foto;
  const [b] = await db.update(barbersTable).set(updates).where(and(eq(barbersTable.id, id), eq(barbersTable.barbershopId, barbershopId))).returning();
  if (!b) { res.status(404).json({ error: "not found" }); return; }
  res.json(fmt(b));
});

router.delete("/barbers/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(barbersTable).where(and(eq(barbersTable.id, id), eq(barbersTable.barbershopId, barbershopId)));
  res.sendStatus(204);
});

export default router;
