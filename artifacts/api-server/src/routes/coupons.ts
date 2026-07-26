import { Router, type IRouter } from "express";
import { nullIfBlank } from "../lib/coerce";
import { eq, and } from "drizzle-orm";
import { db, couponsTable } from "@workspace/db";

const router: IRouter = Router();

function genCode(): string {
  const prefixes = ["BARBER", "VOLTA", "VIP", "CRM", "CORTE"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${prefix}${num}`;
}

const fmt = (c: typeof couponsTable.$inferSelect) => ({
  id: c.id,
  codigo: c.codigo,
  tipo: c.tipo,
  valor: parseFloat(c.valor),
  validade: c.validade ?? null,
  ativo: c.ativo,
  usoMaximo: c.usoMaximo ?? null,
  usoAtual: c.usoAtual,
});

router.get("/coupons", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const rows = await db.select().from(couponsTable).where(eq(couponsTable.barbershopId, barbershopId)).orderBy(couponsTable.id);
  res.json(rows.map(fmt));
});

router.post("/coupons", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const { codigo, tipo, valor, validade, usoMaximo } = req.body;
  if (valor === undefined || valor === null || valor === "") {
    res.status(400).json({ error: "valor is required" });
    return;
  }
  const code = (codigo?.trim().toUpperCase() || genCode());
  try {
    const [c] = await db.insert(couponsTable).values({
      barbershopId,
      codigo: code,
      tipo: tipo ?? "percent",
      valor: String(valor),
      validade: validade || null,
      usoMaximo: (usoMaximo != null && usoMaximo !== "" && usoMaximo !== 0) ? usoMaximo : null,
    }).returning();
    res.status(201).json(fmt(c));
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Já existe um cupom com este código." });
    } else {
      res.status(500).json({ error: "Erro ao criar cupom." });
    }
  }
});

router.patch("/coupons/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const { codigo, tipo, valor, validade, ativo, usoMaximo } = req.body;

  // `validade` é coluna `date` e `uso_maximo` é integer: vazio precisa virar
  // null, senão o Postgres rejeita '' e a query inteira falha com 500.
  const orNull = nullIfBlank;

  const updates: Record<string, unknown> = {};
  if (codigo !== undefined) updates.codigo = codigo;
  if (tipo !== undefined) updates.tipo = tipo;
  if (valor !== undefined) updates.valor = String(valor);
  if (validade !== undefined) updates.validade = orNull(validade);
  if (ativo !== undefined) updates.ativo = ativo;
  if (usoMaximo !== undefined) updates.usoMaximo = orNull(usoMaximo);
  const [c] = await db.update(couponsTable).set(updates).where(and(eq(couponsTable.id, id), eq(couponsTable.barbershopId, barbershopId))).returning();
  if (!c) { res.status(404).json({ error: "not found" }); return; }
  res.json(fmt(c));
});

router.delete("/coupons/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(couponsTable).where(and(eq(couponsTable.id, id), eq(couponsTable.barbershopId, barbershopId)));
  res.sendStatus(204);
});

export default router;
