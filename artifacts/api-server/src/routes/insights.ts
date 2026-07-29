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

  /*
   * Um `group by`, não sete varreduras.
   *
   * A versão anterior rodava uma consulta por dia da semana, cada uma varrendo
   * a tabela inteira de atendimentos da barbearia. Agrupar faz o Postgres
   * percorrer os mesmos dados uma vez só.
   *
   * O `order by` e o `limit 1` deixam a escolha do melhor dia no banco: trazer
   * sete linhas para ordenar em JavaScript funcionaria igual, mas o banco já
   * sabe fazer isso e o resultado fica com uma linha só.
   */
  const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

  const [melhor] = await db
    .select({
      dow: sql<number>`extract(dow from ${appointmentsTable.data})::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(appointmentsTable)
    .where(eq(appointmentsTable.barbershopId, barbershopId))
    .groupBy(sql`extract(dow from ${appointmentsTable.data})`)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  // Sexta como padrão quando ainda não há atendimento nenhum: é palpite, e a
  // versão anterior fazia o mesmo — sem histórico não há o que calcular.
  const bestDay = melhor ? (days[melhor.dow] ?? "Sexta") : "Sexta";

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
