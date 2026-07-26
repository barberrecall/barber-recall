import { Router, type IRouter } from "express";
import { eq, sql, and, gte, lt } from "drizzle-orm";
import { db, clientsTable, appointmentsTable, couponsTable } from "@workspace/db";
import { countByRecallStatus, getDiasRetorno, getTaxaRetorno } from "../lib/recall";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const diasRetorno = await getDiasRetorno(barbershopId);
  const recall = await countByRecallStatus(barbershopId, diasRetorno);

  // "Novos Hoje" é cadastro do dia, não um status de recall.
  const [{ newToday }] = await db.select({ newToday: sql<number>`count(*)` }).from(clientsTable)
    .where(and(eq(clientsTable.barbershopId, barbershopId), gte(clientsTable.createdAt, today), lt(clientsTable.createdAt, tomorrow)));

  const [{ apptToday }] = await db.select({ apptToday: sql<number>`count(*)` }).from(appointmentsTable)
    .where(and(eq(appointmentsTable.barbershopId, barbershopId), gte(appointmentsTable.data, today), lt(appointmentsTable.data, tomorrow)));

  const [{ revenueToday }] = await db.select({ revenueToday: sql<number>`coalesce(sum(valor_final::numeric), 0)` }).from(appointmentsTable)
    .where(and(eq(appointmentsTable.barbershopId, barbershopId), gte(appointmentsTable.data, today), lt(appointmentsTable.data, tomorrow)));

  const [{ couponsUsed }] = await db.select({ couponsUsed: sql<number>`coalesce(sum(uso_atual), 0)` }).from(couponsTable)
    .where(eq(couponsTable.barbershopId, barbershopId));

  const taxaRetorno = await getTaxaRetorno(barbershopId, diasRetorno);

  res.json({
    clientesAtivos: recall.active,
    clientesNovosHoje: Number(newToday),
    clientesAguardandoRetorno: recall.awaiting_return,
    clientesEmRisco: recall.at_risk,
    atendimentosHoje: Number(apptToday),
    faturamentoHoje: parseFloat(String(revenueToday)),
    cuponsUtilizados: Number(couponsUsed),
    taxaRetorno,
  });
});

router.get("/dashboard/charts", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;

  const clientesPorDia: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(clientsTable)
      .where(and(eq(clientsTable.barbershopId, barbershopId), gte(clientsTable.createdAt, d), lt(clientsTable.createdAt, next)));
    clientesPorDia.push({ label: d.toLocaleDateString("pt-BR", { weekday: "short" }), value: Number(count) });
  }

  const retornoMensal: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setMonth(next.getMonth() + 1);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(appointmentsTable)
      .where(and(eq(appointmentsTable.barbershopId, barbershopId), gte(appointmentsTable.data, d), lt(appointmentsTable.data, next)));
    retornoMensal.push({ label: d.toLocaleDateString("pt-BR", { month: "short" }), value: Number(count) });
  }

  const receita: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setMonth(next.getMonth() + 1);
    const [{ total }] = await db.select({ total: sql<number>`coalesce(sum(valor_final::numeric), 0)` }).from(appointmentsTable)
      .where(and(eq(appointmentsTable.barbershopId, barbershopId), gte(appointmentsTable.data, d), lt(appointmentsTable.data, next)));
    receita.push({ label: d.toLocaleDateString("pt-BR", { month: "short" }), value: parseFloat(String(total)) });
  }

  res.json({ clientesPorDia, retornoMensal, receita });
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const rows = await db.select().from(appointmentsTable)
    .where(eq(appointmentsTable.barbershopId, barbershopId))
    .orderBy(sql`${appointmentsTable.createdAt} desc`)
    .limit(10);

  const result = await Promise.all(rows.map(async (a, i) => {
    const [client] = await db.select({ nome: clientsTable.nome }).from(clientsTable).where(eq(clientsTable.id, a.clienteId));
    return {
      id: i + 1,
      tipo: "appointment" as const,
      descricao: `Atendimento registrado para ${client?.nome ?? "cliente"}`,
      data: a.createdAt.toISOString(),
      clienteNome: client?.nome ?? null,
      valor: parseFloat(a.valorFinal),
    };
  }));

  res.json(result);
});

export default router;
