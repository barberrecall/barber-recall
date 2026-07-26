import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, appointmentsTable, clientsTable, barbersTable, servicesTable } from "@workspace/db";

const router: IRouter = Router();

async function fmtAppt(a: typeof appointmentsTable.$inferSelect) {
  const [client] = await db.select({ nome: clientsTable.nome }).from(clientsTable).where(eq(clientsTable.id, a.clienteId));
  let barbeiroNome: string | null = null;
  let servicoNome: string | null = null;
  if (a.barbeiroId) {
    const [b] = await db.select({ nome: barbersTable.nome }).from(barbersTable).where(eq(barbersTable.id, a.barbeiroId));
    barbeiroNome = b?.nome ?? null;
  }
  if (a.servicoId) {
    const [s] = await db.select({ nome: servicesTable.nome }).from(servicesTable).where(eq(servicesTable.id, a.servicoId));
    servicoNome = s?.nome ?? null;
  }
  return {
    id: a.id,
    clienteId: a.clienteId,
    clienteNome: client?.nome ?? null,
    barbeiroId: a.barbeiroId ?? null,
    barbeiroNome,
    servicoId: a.servicoId ?? null,
    servicoNome,
    valor: parseFloat(a.valor),
    desconto: parseFloat(a.desconto),
    valorFinal: parseFloat(a.valorFinal),
    data: a.data.toISOString(),
    observacoes: a.observacoes ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/appointments", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const { date, barberId, clientId } = req.query as { date?: string; barberId?: string; clientId?: string };

  const conditions = [eq(appointmentsTable.barbershopId, barbershopId)];
  if (barberId) conditions.push(eq(appointmentsTable.barbeiroId, parseInt(barberId, 10)));
  if (clientId) conditions.push(eq(appointmentsTable.clienteId, parseInt(clientId, 10)));
  if (date) conditions.push(sql`DATE(${appointmentsTable.data}) = ${date}`);

  const rows = await db.select().from(appointmentsTable).where(and(...conditions)).orderBy(sql`${appointmentsTable.data} desc`);
  const result = await Promise.all(rows.map(fmtAppt));
  res.json(result);
});

router.post("/appointments", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const { clienteId, barbeiroId, servicoId, valor, desconto, valorFinal, data, observacoes } = req.body;
  if (!clienteId || !data) {
    res.status(400).json({ error: "clienteId and data are required" });
    return;
  }

  // Validate that referenced records belong to this barbershop
  const [clientOwned] = await db.select({ id: clientsTable.id }).from(clientsTable)
    .where(and(eq(clientsTable.id, clienteId), eq(clientsTable.barbershopId, barbershopId)));
  if (!clientOwned) { res.status(400).json({ error: "Cliente não pertence a esta barbearia." }); return; }

  if (barbeiroId) {
    const [barberOwned] = await db.select({ id: barbersTable.id }).from(barbersTable)
      .where(and(eq(barbersTable.id, barbeiroId), eq(barbersTable.barbershopId, barbershopId)));
    if (!barberOwned) { res.status(400).json({ error: "Barbeiro não pertence a esta barbearia." }); return; }
  }

  if (servicoId) {
    const [serviceOwned] = await db.select({ id: servicesTable.id }).from(servicesTable)
      .where(and(eq(servicesTable.id, servicoId), eq(servicesTable.barbershopId, barbershopId)));
    if (!serviceOwned) { res.status(400).json({ error: "Serviço não pertence a esta barbearia." }); return; }
  }

  const [a] = await db.insert(appointmentsTable).values({
    barbershopId,
    clienteId,
    barbeiroId: barbeiroId ?? null,
    servicoId: servicoId ?? null,
    valor: String(valor ?? 0),
    desconto: String(desconto ?? 0),
    valorFinal: String(valorFinal ?? valor ?? 0),
    data: new Date(data),
    observacoes: observacoes ?? null,
  }).returning();

  await db.update(clientsTable)
    .set({
      ultimoAtendimento: new Date(data),
      totalVisitas: sql`${clientsTable.totalVisitas} + 1`,
      // Cache: o status exibido é sempre derivado em ../lib/recall.
      status: "active",
    })
    .where(and(eq(clientsTable.id, clienteId), eq(clientsTable.barbershopId, barbershopId)));

  res.status(201).json(await fmtAppt(a));
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const [a] = await db.select().from(appointmentsTable).where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.barbershopId, barbershopId)));
  if (!a) { res.status(404).json({ error: "not found" }); return; }
  res.json(await fmtAppt(a));
});

router.patch("/appointments/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const { barbeiroId, servicoId, valor, desconto, valorFinal, data, observacoes } = req.body;
  const updates: Record<string, unknown> = {};
  if (barbeiroId !== undefined) updates.barbeiroId = barbeiroId;
  if (servicoId !== undefined) updates.servicoId = servicoId;
  if (valor !== undefined) updates.valor = String(valor);
  if (desconto !== undefined) updates.desconto = String(desconto);
  if (valorFinal !== undefined) updates.valorFinal = String(valorFinal);
  if (data !== undefined) updates.data = new Date(data);
  if (observacoes !== undefined) updates.observacoes = observacoes;
  const [a] = await db.update(appointmentsTable).set(updates).where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.barbershopId, barbershopId))).returning();
  if (!a) { res.status(404).json({ error: "not found" }); return; }
  res.json(await fmtAppt(a));
});

router.delete("/appointments/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(appointmentsTable).where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.barbershopId, barbershopId)));
  res.sendStatus(204);
});

export default router;
