import { Router, type IRouter } from "express";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, clientsTable, appointmentsTable, barbersTable, servicesTable } from "@workspace/db";
import { getDiasRetorno, isRecallStatus, recallStatusSql, type RecallStatus } from "../lib/recall";

const router: IRouter = Router();

// `status` sempre vem do cálculo de recall, nunca da coluna `clients.status`.
const fmt = (c: typeof clientsTable.$inferSelect, status: RecallStatus) => ({
  id: c.id,
  nome: c.nome,
  telefone: c.telefone,
  email: c.email ?? null,
  dataNascimento: c.dataNascimento ?? null,
  observacoes: c.observacoes ?? null,
  status,
  ativo: c.ativo,
  totalVisitas: c.totalVisitas,
  ultimoAtendimento: c.ultimoAtendimento?.toISOString() ?? null,
  createdAt: c.createdAt.toISOString(),
});

const fmtAppt = (
  a: typeof appointmentsTable.$inferSelect,
  barbeiroNome: string | null,
  servicoNome: string | null,
  clienteNome: string | null,
) => ({
  id: a.id,
  clienteId: a.clienteId,
  clienteNome: clienteNome ?? null,
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
});

router.get("/clients", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const { search, status, barberId } = req.query as { search?: string; status?: string; barberId?: string };

  const diasRetorno = await getDiasRetorno(barbershopId);
  const statusSql = recallStatusSql(diasRetorno);

  const conditions = [eq(clientsTable.barbershopId, barbershopId)];
  if (status && isRecallStatus(status)) {
    conditions.push(sql`${statusSql} = ${status}`);
  }
  if (search) {
    conditions.push(ilike(clientsTable.nome, `%${search}%`));
  }
  if (barberId) {
    const barberIdNum = parseInt(barberId, 10);
    if (!isNaN(barberIdNum)) {
      const clientIds = await db
        .selectDistinct({ id: appointmentsTable.clienteId })
        .from(appointmentsTable)
        .where(and(eq(appointmentsTable.barbershopId, barbershopId), eq(appointmentsTable.barbeiroId, barberIdNum)));
      const ids = clientIds.map((r) => r.id);
      if (ids.length > 0) {
        conditions.push(sql`${clientsTable.id} = ANY(${ids})`);
      } else {
        res.json([]);
        return;
      }
    }
  }

  const rows = await db.select({ client: clientsTable, recallStatus: statusSql })
    .from(clientsTable).where(and(...conditions)).orderBy(clientsTable.nome);
  res.json(rows.map((r) => fmt(r.client, r.recallStatus)));
});

router.post("/clients", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const { nome, telefone, email, dataNascimento, observacoes } = req.body;
  if (!nome || !telefone) {
    res.status(400).json({ error: "nome and telefone are required" });
    return;
  }
  try {
    const [c] = await db
      .insert(clientsTable)
      .values({
        barbershopId,
        nome,
        telefone,
        email: email || null,
        dataNascimento: dataNascimento || null,
        observacoes: observacoes || null,
      })
      .returning();
    // Cliente recém-cadastrado ainda está dentro da janela de retorno.
    res.status(201).json(fmt(c, "active"));
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "Já existe um cliente com este telefone." });
    } else {
      res.status(500).json({ error: "Erro ao cadastrar cliente." });
    }
  }
});

router.get("/clients/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const diasRetorno = await getDiasRetorno(barbershopId);
  const [row] = await db.select({ client: clientsTable, recallStatus: recallStatusSql(diasRetorno) })
    .from(clientsTable).where(and(eq(clientsTable.id, id), eq(clientsTable.barbershopId, barbershopId)));
  if (!row) { res.status(404).json({ error: "not found" }); return; }
  res.json(fmt(row.client, row.recallStatus));
});

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  // `status` não é editável: vem do cálculo de recall (ver ../lib/recall).
  const { nome, telefone, email, dataNascimento, observacoes, ativo } = req.body;

  // Limpar um campo opcional chega como string vazia, e `data_nascimento` é uma
  // coluna `date`: o Postgres rejeita '' e a query inteira falha com 500. As
  // colunas nulláveis recebem null, igual ao que o POST já fazia.
  const orNull = (value: unknown) => (value === "" ? null : value);

  const updates: Record<string, unknown> = {};
  if (nome !== undefined) updates.nome = nome;
  if (telefone !== undefined) updates.telefone = telefone;
  if (email !== undefined) updates.email = orNull(email);
  if (dataNascimento !== undefined) updates.dataNascimento = orNull(dataNascimento);
  if (observacoes !== undefined) updates.observacoes = orNull(observacoes);
  if (ativo !== undefined) updates.ativo = ativo;
  const [c] = await db.update(clientsTable).set(updates).where(and(eq(clientsTable.id, id), eq(clientsTable.barbershopId, barbershopId))).returning();
  if (!c) { res.status(404).json({ error: "not found" }); return; }
  const diasRetorno = await getDiasRetorno(barbershopId);
  const [row] = await db.select({ recallStatus: recallStatusSql(diasRetorno) })
    .from(clientsTable).where(eq(clientsTable.id, c.id));
  res.json(fmt(c, row!.recallStatus));
});

router.delete("/clients/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  await db.delete(clientsTable).where(and(eq(clientsTable.id, id), eq(clientsTable.barbershopId, barbershopId)));
  res.sendStatus(204);
});

router.get("/clients/:id/appointments", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const [client] = await db.select({ nome: clientsTable.nome }).from(clientsTable)
    .where(and(eq(clientsTable.id, id), eq(clientsTable.barbershopId, barbershopId)));
  if (!client) { res.status(404).json({ error: "not found" }); return; }

  const rows = await db.select().from(appointmentsTable)
    .where(and(eq(appointmentsTable.clienteId, id), eq(appointmentsTable.barbershopId, barbershopId)))
    .orderBy(sql`${appointmentsTable.data} desc`);

  const result = await Promise.all(rows.map(async (a) => {
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
    return fmtAppt(a, barbeiroNome, servicoNome, client.nome);
  }));

  res.json(result);
});

export default router;
