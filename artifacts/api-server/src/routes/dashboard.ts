import { Router, type IRouter } from "express";
import { eq, sql, and, gte, lt } from "drizzle-orm";
import { db, clientsTable, appointmentsTable, couponsTable } from "@workspace/db";
import { countByRecallStatus, getDiasRetorno, getTaxaRetorno } from "../lib/recall";
import { diaLocal, hojeLocal, FUSO_BARBEARIA } from "../lib/fuso";

const router: IRouter = Router();

router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;

  /*
   * "Hoje" é o dia no calendário da barbearia.
   *
   * `new Date(); setHours(0,0,0,0)` usa o fuso do processo, que no Railway é
   * UTC. Meia-noite em Londres são 21:00 do dia anterior em Mossoró, então
   * tudo que acontecia das 21h à meia-noite era contado no dia seguinte — o
   * barbeiro fechava o caixa e via o faturamento zerado.
   */
  const ehHoje = (coluna: Parameters<typeof diaLocal>[0]) =>
    sql`${diaLocal(coluna)} = ${hojeLocal()}`;

  const diasRetorno = await getDiasRetorno(barbershopId);
  const recall = await countByRecallStatus(barbershopId, diasRetorno);

  // "Novos Hoje" é cadastro do dia, não um status de recall.
  const [{ newToday }] = await db.select({ newToday: sql<number>`count(*)` }).from(clientsTable)
    .where(and(eq(clientsTable.barbershopId, barbershopId), ehHoje(clientsTable.createdAt)));

  const [{ apptToday }] = await db.select({ apptToday: sql<number>`count(*)` }).from(appointmentsTable)
    .where(and(eq(appointmentsTable.barbershopId, barbershopId), ehHoje(appointmentsTable.data)));

  const [{ revenueToday }] = await db.select({ revenueToday: sql<number>`coalesce(sum(valor_final::numeric), 0)` }).from(appointmentsTable)
    .where(and(eq(appointmentsTable.barbershopId, barbershopId), ehHoje(appointmentsTable.data)));

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

  /*
   * Séries agregadas no banco, no fuso da barbearia.
   *
   * A versão anterior fazia um laço em JavaScript com uma consulta por ponto —
   * 19 idas ao banco para desenhar três gráficos — e montava as fatias com
   * `setHours(0,0,0,0)`, que usa o fuso do processo. No Railway isso é UTC,
   * então cada "dia" começava às 21:00 do dia anterior em Mossoró e os pontos
   * saíam deslocados.
   *
   * `generate_series` cria as fatias no próprio banco, o `left join` garante
   * que dia sem movimento apareça como zero em vez de sumir do gráfico, e o
   * `AT TIME ZONE` faz o corte cair onde o barbeiro espera.
   */
  const fuso = sql.raw(`'${FUSO_BARBEARIA}'`);

  const seteDias = await db.execute<{ dia: string; total: number }>(sql`
    with dias as (
      select generate_series(
        ((now() AT TIME ZONE ${fuso})::date - interval '6 days'),
        ((now() AT TIME ZONE ${fuso})::date),
        interval '1 day'
      )::date as dia
    )
    select dias.dia::text as dia, count(c.id)::int as total
    from dias
    left join clients c
      on c.barbershop_id = ${barbershopId}
     and (c.created_at AT TIME ZONE ${fuso})::date = dias.dia
    group by dias.dia
    order by dias.dia
  `);

  const seisMeses = await db.execute<{ mes: string; atendimentos: number; receita: number }>(sql`
    with meses as (
      select generate_series(
        date_trunc('month', (now() AT TIME ZONE ${fuso})::date - interval '5 months'),
        date_trunc('month', (now() AT TIME ZONE ${fuso})::date),
        interval '1 month'
      )::date as mes
    )
    select meses.mes::text as mes,
           count(a.id)::int as atendimentos,
           coalesce(sum(a.valor_final::numeric), 0)::float as receita
    from meses
    left join appointments a
      on a.barbershop_id = ${barbershopId}
     and date_trunc('month', (a.data AT TIME ZONE ${fuso})) = meses.mes
    group by meses.mes
    order by meses.mes
  `);

  const rotuloDia = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short" });
  const rotuloMes = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { month: "short" });

  res.json({
    clientesPorDia: seteDias.rows.map((r) => ({ label: rotuloDia(r.dia), value: Number(r.total) })),
    retornoMensal: seisMeses.rows.map((r) => ({ label: rotuloMes(r.mes), value: Number(r.atendimentos) })),
    receita: seisMeses.rows.map((r) => ({ label: rotuloMes(r.mes), value: Number(r.receita) })),
  });
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  // O nome do cliente vem junto, em vez de uma consulta por linha. São só 10
  // linhas, mas isto abre no Dashboard — a tela que todo mundo carrega primeiro
  // e a que mais dói quando demora.
  const rows = await db
    .select({
      createdAt: appointmentsTable.createdAt,
      valorFinal: appointmentsTable.valorFinal,
      clienteNome: clientsTable.nome,
    })
    .from(appointmentsTable)
    .leftJoin(clientsTable, eq(clientsTable.id, appointmentsTable.clienteId))
    .where(eq(appointmentsTable.barbershopId, barbershopId))
    .orderBy(sql`${appointmentsTable.createdAt} desc`)
    .limit(10);

  res.json(
    rows.map((a, i) => ({
      id: i + 1,
      tipo: "appointment" as const,
      descricao: `Atendimento registrado para ${a.clienteNome ?? "cliente"}`,
      data: a.createdAt.toISOString(),
      clienteNome: a.clienteNome ?? null,
      valor: parseFloat(a.valorFinal),
    })),
  );
});

export default router;
