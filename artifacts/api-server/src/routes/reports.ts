import { Router, type IRouter } from "express";
import { eq, sql, gte, lt, and } from "drizzle-orm";
import { db, appointmentsTable, clientsTable, couponsTable, notificationsTable } from "@workspace/db";
import { getDiasRetorno, getRetornoMedio, getTaxaRetorno } from "../lib/recall";
import { diaLocal, hojeLocal, FUSO_BARBEARIA } from "../lib/fuso";

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
  // Ver lib/fuso: o dia é o do calendário da barbearia, não o de UTC.
  const ehHoje = sql`${diaLocal(appointmentsTable.data)} = ${hojeLocal()}`;

  const [{ receitaDiaria }] = await db.select({ receitaDiaria: sql<number>`coalesce(sum(valor_final::numeric), 0)` }).from(appointmentsTable)
    .where(and(eq(appointmentsTable.barbershopId, barbershopId), ehHoje));

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

  /*
   * Uma consulta para a série inteira, e não uma por dia.
   *
   * No período de um ano a versão anterior fazia 730 idas ao banco — duas por
   * dia — e montava cada fatia com `setHours(0,0,0,0)`, que usa o fuso do
   * processo. Em UTC isso faz o dia começar às 21:00 do dia anterior em
   * Mossoró, deslocando todos os pontos.
   *
   * O `left join` sobre `generate_series` garante que dia sem movimento vire
   * zero em vez de sumir, o que manteria o gráfico com a forma errada.
   */
  const fuso = sql.raw(`'${FUSO_BARBEARIA}'`);

  const serie = await db.execute<{ dia: string; receita: number; atendimentos: number }>(sql`
    with dias as (
      select generate_series(
        ((now() AT TIME ZONE ${fuso})::date - ${sql.raw(String(days - 1))} * interval '1 day'),
        ((now() AT TIME ZONE ${fuso})::date),
        interval '1 day'
      )::date as dia
    )
    select dias.dia::text as dia,
           coalesce(sum(a.valor_final::numeric), 0)::float as receita,
           count(a.id)::int as atendimentos
    from dias
    left join appointments a
      on a.barbershop_id = ${barbershopId}
     and (a.data AT TIME ZONE ${fuso})::date = dias.dia
    group by dias.dia
    order by dias.dia
  `);

  res.json(
    serie.rows.map((r) => ({
      date: new Date(`${r.dia}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      revenue: Number(r.receita),
      appointments: Number(r.atendimentos),
    })),
  );
});

router.get("/reports/clients", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const period = (req.query.period as string) || "month";
  const days = period === "week" ? 7 : period === "year" ? 365 : 30;

  // Mesmo tratamento da série de receita acima: uma consulta, fatias montadas
  // no banco e no fuso da barbearia.
  const fuso = sql.raw(`'${FUSO_BARBEARIA}'`);

  const serie = await db.execute<{ dia: string; novos: number; recorrentes: number }>(sql`
    with dias as (
      select generate_series(
        ((now() AT TIME ZONE ${fuso})::date - ${sql.raw(String(days - 1))} * interval '1 day'),
        ((now() AT TIME ZONE ${fuso})::date),
        interval '1 day'
      )::date as dia
    )
    select dias.dia::text as dia,
           (select count(*) from clients c
             where c.barbershop_id = ${barbershopId}
               and (c.created_at AT TIME ZONE ${fuso})::date = dias.dia)::int as novos,
           (select count(*) from appointments a
             where a.barbershop_id = ${barbershopId}
               and (a.data AT TIME ZONE ${fuso})::date = dias.dia)::int as recorrentes
    from dias
    order by dias.dia
  `);

  res.json(
    serie.rows.map((r) => ({
      date: new Date(`${r.dia}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      novos: Number(r.novos),
      recorrentes: Number(r.recorrentes),
    })),
  );
});

export default router;
