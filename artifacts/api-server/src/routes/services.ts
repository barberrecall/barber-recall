import { Router, type IRouter } from "express";
import { requiredNumber } from "../lib/coerce";
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
  const { nome } = req.body;
  const errors: string[] = [];

  // `valor` e `duracao` são colunas numéricas NOT NULL: string vazia precisa
  // virar 400 aqui, senão o Postgres rejeita '' e o erro sai como 500.
  const valor = requiredNumber(req.body.valor, "valor", errors, { min: 0 });
  const duracao = requiredNumber(req.body.duracao ?? 30, "duracao", errors, {
    integer: true,
    min: 1,
  });

  if (!nome) errors.push("nome é obrigatório.");
  if (valor === undefined && !errors.some((e) => e.startsWith("valor"))) {
    errors.push("valor é obrigatório.");
  }

  if (errors.length > 0) { res.status(400).json({ error: errors.join(" ") }); return; }

  const [s] = await db.insert(servicesTable).values({ barbershopId, nome, valor: String(valor), duracao: duracao! }).returning();
  res.status(201).json(fmt(s));
});

router.patch("/services/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const { nome, ativo } = req.body;
  const errors: string[] = [];
  const valor = requiredNumber(req.body.valor, "valor", errors, { min: 0 });
  const duracao = requiredNumber(req.body.duracao, "duracao", errors, {
    integer: true,
    min: 1,
  });
  if (errors.length > 0) { res.status(400).json({ error: errors.join(" ") }); return; }
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
