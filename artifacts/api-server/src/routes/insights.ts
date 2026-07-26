import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, appointmentsTable } from "@workspace/db";
import { countByRecallStatus, getDiasRetorno, MARGEM_RETORNO_DIAS } from "../lib/recall";

const router: IRouter = Router();

router.get("/insights", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;

  const diasRetorno = await getDiasRetorno(barbershopId);
  const recall = await countByRecallStatus(barbershopId, diasRetorno);

  const [{ ticketMedio }] = await db.select({ ticketMedio: sql<number>`coalesce(avg(valor_final::numeric), 0)` }).from(appointmentsTable)
    .where(eq(appointmentsTable.barbershopId, barbershopId));

  const clientesEmRisco = recall.at_risk;
  const potentialRevenue = clientesEmRisco * parseFloat(String(ticketMedio));

  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
  const dayCounts = await Promise.all(
    [0, 1, 2, 3, 4, 5, 6].map(async (d) => {
      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(appointmentsTable)
        .where(and(eq(appointmentsTable.barbershopId, barbershopId), sql`EXTRACT(DOW FROM data) = ${d}`));
      return { day: days[d], count: Number(count) };
    })
  );
  const bestDay = dayCounts.sort((a, b) => b.count - a.count)[0]?.day ?? "Sexta";

  const insights = [
    { id: 1, tipo: "warning" as const, mensagem: `${clientesEmRisco} clientes estão em risco: passaram de ${diasRetorno + MARGEM_RETORNO_DIAS} dias sem cortar o cabelo.`, impacto: potentialRevenue },
    { id: 2, tipo: "opportunity" as const, mensagem: `Você pode recuperar aproximadamente R$${potentialRevenue.toFixed(2).replace(".", ",")} enviando uma campanha hoje.`, impacto: potentialRevenue },
    { id: 3, tipo: recall.awaiting_return > 0 ? "warning" as const : "success" as const, mensagem: recall.awaiting_return > 0 ? `${recall.awaiting_return} clientes estão aguardando retorno (passaram de ${diasRetorno} dias). Uma campanha agora evita que virem risco.` : "Nenhum cliente aguardando retorno no momento. Excelente taxa de retenção!", impacto: null },
    { id: 4, tipo: "info" as const, mensagem: `${bestDay} é o melhor dia para enviar campanhas com base no histórico de retorno.`, impacto: null },
    { id: 5, tipo: "success" as const, mensagem: `Ticket médio de R$${parseFloat(String(ticketMedio)).toFixed(2).replace(".", ",")} por atendimento.`, impacto: parseFloat(String(ticketMedio)) },
  ];

  res.json({ insights, potentialRevenue: Math.round(potentialRevenue * 100) / 100, clientesEmRisco, melhorDiaCampanha: bestDay, melhorHorario: "10:00 - 12:00" });
});

export default router;
