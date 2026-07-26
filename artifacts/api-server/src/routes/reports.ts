import { Router, type IRouter } from "express";
import { eq, sql, gte, lt, and } from "drizzle-orm";
import { db, appointmentsTable, clientsTable, couponsTable, notificationsTable } from "@workspace/db";
import { getDiasRetorno, getRetornoMedio, getTaxaRetorno } from "../lib/recall";

const router: IRouter = Router();

function getPeriodRange(period: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  if (period === "week") start.setDate(start.getDate() - 7);
  else if (period === "year") start.setFullYear(start.getFullYear() - 1);
  else start.setMonth(start.getMonth() - 1);
  return { start, end };
}

router.get("/reports/overview", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const period = (req.query.period as string) || "month";
  const { start, end } = getPeriodRange(period);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const [{ receitaDiaria }] = await db.select({ receitaDiaria: sql<number>`coalesce(sum(valor_final::numeric), 0)` }).from(appointmentsTable)
    .where(and(eq(appointmentsTable.barbershopId, barbershopId), gte(appointmentsTable.data, today), lt(appointmentsTable.data, tomorrow)));

  const [{ receitaMensal }] = await db.select({ receitaMensal: sql<number>`coalesce(sum(valor_final::numeric), 0)` }).from(appointmentsTable)
    .where(and(eq(appointmentsTable.barbershopId, barbershopId), gte(appointmentsTable.data, start), lt(appointmentsTable.data, end)));

  const [{ clientesNovos }] = await db.select({ clientesNovos: sql<number>`count(*)` }).from(clientsTable)
    .where(and(eq(clientsTable.barbershopId, barbershopId), gte(clientsTable.createdAt, start), lt(clientsTable.createdAt, end)));

  const [{ clientesRecorrentes }] = await db.select({ clientesRecorrentes: sql<number>`count(distinct cliente_id)` }).from(appointmentsTable)
    .where(and(eq(appointmentsTable.barbershopId, barbershopId), gte(appointmentsTable.data, start), lt(appointmentsTable.data, end)));

  const [{ ticketMedio }] = await db.select({ ticketMedio: sql<number>`coalesce(avg(valor_final::numeric), 0)` }).from(appointmentsTable)
    .where(and(eq(appointmentsTable.barbershopId, barbershopId), gte(appointmentsTable.data, start), lt(appointmentsTable.data, end)));

  const [{ cuponsUsados }] = await db.select({ cuponsUsados: sql<number>`coalesce(sum(uso_atual), 0)` }).from(couponsTable)
    .where(eq(couponsTable.barbershopId, barbershopId));

  const [{ campanhasEnviadas }] = await db.select({ campanhasEnviadas: sql<number>`count(*)` }).from(notificationsTable)
    .where(eq(notificationsTable.barbershopId, barbershopId));

  const [{ abertas }] = await db.select({ abertas: sql<number>`count(*)` }).from(notificationsTable)
    .where(and(eq(notificationsTable.barbershopId, barbershopId), sql`opened = true`));

  const taxaAbertura = Number(campanhasEnviadas) > 0 ? Math.round((Number(abertas) / Number(campanhasEnviadas)) * 100) : 0;

  const taxaRetorno = await getTaxaRetorno(barbershopId, await getDiasRetorno(barbershopId));
  const tempoMedioRetorno = await getRetornoMedio(barbershopId);

  res.json({
    receitaDiaria: parseFloat(String(receitaDiaria)),
    receitaMensal: parseFloat(String(receitaMensal)),
    clientesNovos: Number(clientesNovos),
    clientesRecorrentes: Number(clientesRecorrentes),
    tempoMedioRetorno,
    ticketMedio: parseFloat(String(ticketMedio)),
    cuponsUsados: Number(cuponsUsados),
    campanhasEnviadas: Number(campanhasEnviadas),
    taxaAbertura,
    taxaRetorno,
  });
});

router.get("/reports/revenue", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const period = (req.query.period as string) || "month";
  const days = period === "week" ? 7 : period === "year" ? 365 : 30;

  const points: { date: string; revenue: number; appointments: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const [{ revenue }] = await db.select({ revenue: sql<number>`coalesce(sum(valor_final::numeric), 0)` }).from(appointmentsTable)
      .where(and(eq(appointmentsTable.barbershopId, barbershopId), gte(appointmentsTable.data, d), lt(appointmentsTable.data, next)));
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(appointmentsTable)
      .where(and(eq(appointmentsTable.barbershopId, barbershopId), gte(appointmentsTable.data, d), lt(appointmentsTable.data, next)));
    points.push({ date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), revenue: parseFloat(String(revenue)), appointments: Number(count) });
  }
  res.json(points);
});

router.get("/reports/clients", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const period = (req.query.period as string) || "month";
  const days = period === "week" ? 7 : period === "year" ? 365 : 30;

  const points: { date: string; novos: number; recorrentes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    const next = new Date(d); next.setDate(next.getDate() + 1);
    const [{ novos }] = await db.select({ novos: sql<number>`count(*)` }).from(clientsTable)
      .where(and(eq(clientsTable.barbershopId, barbershopId), gte(clientsTable.createdAt, d), lt(clientsTable.createdAt, next)));
    const [{ recorrentes }] = await db.select({ recorrentes: sql<number>`count(*)` }).from(appointmentsTable)
      .where(and(eq(appointmentsTable.barbershopId, barbershopId), gte(appointmentsTable.data, d), lt(appointmentsTable.data, next)));
    points.push({ date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), novos: Number(novos), recorrentes: Number(recorrentes) });
  }
  res.json(points);
});

export default router;
