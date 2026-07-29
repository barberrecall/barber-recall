import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, appointmentsTable, clientsTable, barbersTable, servicesTable, couponsTable } from "@workspace/db";
import { syncClientRecallCache } from "../lib/recall";
import { nullableInt, requiredNumber, requiredDate } from "../lib/coerce";
import { diaLocal, hojeLocal } from "../lib/fuso";
import { validarCupom } from "../lib/cupom";

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
  // O código, e não só o id: a tela precisa mostrar QUAL cupom foi usado, e o
  // id sozinho obrigaria o cliente a buscar de novo.
  let cupomCodigo: string | null = null;
  if (a.cupomId) {
    const [c] = await db.select({ codigo: couponsTable.codigo }).from(couponsTable).where(eq(couponsTable.id, a.cupomId));
    cupomCodigo = c?.codigo ?? null;
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
    cupomId: a.cupomId ?? null,
    cupomCodigo,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/appointments", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const { date, barberId, clientId } = req.query as { date?: string; barberId?: string; clientId?: string };

  const conditions = [eq(appointmentsTable.barbershopId, barbershopId)];
  if (barberId) conditions.push(eq(appointmentsTable.barbeiroId, parseInt(barberId, 10)));
  if (clientId) conditions.push(eq(appointmentsTable.clienteId, parseInt(clientId, 10)));
  // O dia vem do calendário da barbearia, não de Londres. `DATE()` direto na
  // coluna usa o fuso da sessão do banco, que é GMT, e jogava todo atendimento
  // registrado depois das 21h para o dia seguinte.
  if (date) conditions.push(sql`${diaLocal(appointmentsTable.data)} = ${date}::date`);

  const rows = await db.select().from(appointmentsTable).where(and(...conditions)).orderBy(sql`${appointmentsTable.data} desc`);
  const result = await Promise.all(rows.map(fmtAppt));
  res.json(result);
});

router.post("/appointments", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const body = req.body;
  const errors: string[] = [];

  // Coerção antes de qualquer consulta: um `""` chegando numa coluna numérica ou
  // de data derruba a query com 500 em vez de dizer o que está errado.
  const clienteId = requiredNumber(body.clienteId, "clienteId", errors, { integer: true });
  const barbeiroId = nullableInt(body.barbeiroId, "barbeiroId", errors);
  const servicoId = nullableInt(body.servicoId, "servicoId", errors);
  const valor = requiredNumber(body.valor ?? 0, "valor", errors, { min: 0 });
  const desconto = requiredNumber(body.desconto ?? 0, "desconto", errors, { min: 0 });
  const valorFinal = requiredNumber(
    body.valorFinal ?? body.valor ?? 0,
    "valorFinal",
    errors,
    { min: 0 },
  );
  const data = requiredDate(body.data, "data", errors);

  if (clienteId === undefined) errors.push("clienteId é obrigatório.");
  if (data === undefined && !errors.some((e) => e.startsWith("data"))) {
    errors.push("data é obrigatória.");
  }

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join(" ") });
    return;
  }

  // Validate that referenced records belong to this barbershop
  const [clientOwned] = await db.select({ id: clientsTable.id }).from(clientsTable)
    .where(and(eq(clientsTable.id, clienteId!), eq(clientsTable.barbershopId, barbershopId)));
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

  /*
   * Cupom, quando informado.
   *
   * Antes desta parte o `couponCode` era aceito pelo formulário, declarado no
   * openapi e ignorado pelo servidor: o barbeiro digitava o código, salvava, e
   * o resgate desaparecia. O "Cupons Usados" do Dashboard nunca saía de zero
   * porque nada incrementava `uso_atual`.
   *
   * Código inválido é ERRO, não silêncio. Salvar o atendimento ignorando o
   * cupom faria o barbeiro dar o desconto no balcão e a barbearia não registrar
   * — divergência de caixa que só aparece no fechamento do mês.
   *
   * O desconto é calculado AQUI, e não aceito do cliente. O valor que vem do
   * navegador é palpite da tela; quem decide quanto um cupom vale é o cupom.
   */
  let cupomId: number | null = null;
  let descontoFinal = desconto!;
  let valorFinalCalculado = valorFinal!;

  const codigo = typeof body.couponCode === "string" ? body.couponCode.trim() : "";

  if (codigo) {
    const [cupom] = await db
      .select()
      .from(couponsTable)
      .where(and(eq(couponsTable.codigo, codigo), eq(couponsTable.barbershopId, barbershopId)));

    // A data de hoje sai do banco, no fuso da barbearia: comparar validade com
    // `new Date()` usaria UTC e recusaria um cupom válido a partir das 21h.
    const [{ hoje }] = await db.execute<{ hoje: string }>(sql`select ${hojeLocal()} as hoje`).then((r) => r.rows);

    const resultado = validarCupom(cupom, valor!, hoje);

    if (!resultado.ok) {
      res.status(400).json({ error: resultado.motivo });
      return;
    }

    cupomId = cupom!.id;
    descontoFinal = resultado.desconto;
    valorFinalCalculado = Math.round((valor! - resultado.desconto) * 100) / 100;
  }

  const [a] = await db.transaction(async (tx) => {
    const [criado] = await tx.insert(appointmentsTable).values({
      barbershopId,
      clienteId: clienteId!,
      barbeiroId: barbeiroId ?? null,
      servicoId: servicoId ?? null,
      valor: String(valor),
      desconto: String(descontoFinal),
      valorFinal: String(valorFinalCalculado),
      data: data!,
      observacoes: body.observacoes ?? null,
      cupomId,
    }).returning();

    // Na mesma transação: se o atendimento falhar, o cupom não pode ficar
    // marcado como usado — e vice-versa.
    if (cupomId !== null) {
      await tx
        .update(couponsTable)
        .set({ usoAtual: sql`${couponsTable.usoAtual} + 1` })
        .where(eq(couponsTable.id, cupomId));
    }

    return [criado];
  });

  await syncClientRecallCache(clienteId!, barbershopId);

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
  const body = req.body;
  const errors: string[] = [];

  const barbeiroId = nullableInt(body.barbeiroId, "barbeiroId", errors);
  const servicoId = nullableInt(body.servicoId, "servicoId", errors);
  const valor = requiredNumber(body.valor, "valor", errors, { min: 0 });
  const desconto = requiredNumber(body.desconto, "desconto", errors, { min: 0 });
  const valorFinal = requiredNumber(body.valorFinal, "valorFinal", errors, { min: 0 });
  const data = requiredDate(body.data, "data", errors);

  if (errors.length > 0) {
    res.status(400).json({ error: errors.join(" ") });
    return;
  }

  const updates: Record<string, unknown> = {};
  // `!== undefined` distingue "não enviado" de "enviado vazio": o primeiro
  // deixa o campo como está, o segundo já virou null ou erro acima.
  if (barbeiroId !== undefined) updates.barbeiroId = barbeiroId;
  if (servicoId !== undefined) updates.servicoId = servicoId;
  if (valor !== undefined) updates.valor = String(valor);
  if (desconto !== undefined) updates.desconto = String(desconto);
  if (valorFinal !== undefined) updates.valorFinal = String(valorFinal);
  if (data !== undefined) updates.data = data;
  if (body.observacoes !== undefined) updates.observacoes = body.observacoes;
  const [a] = await db.update(appointmentsTable).set(updates).where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.barbershopId, barbershopId))).returning();
  if (!a) { res.status(404).json({ error: "not found" }); return; }

  // A data pode ter mudado, movendo o atendimento entre passado e futuro.
  await syncClientRecallCache(a.clienteId, barbershopId);

  res.json(await fmtAppt(a));
});

router.delete("/appointments/:id", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }
  const [deleted] = await db.transaction(async (tx) => {
    const [removido] = await tx.delete(appointmentsTable)
      .where(and(eq(appointmentsTable.id, id), eq(appointmentsTable.barbershopId, barbershopId)))
      .returning({ clienteId: appointmentsTable.clienteId, cupomId: appointmentsTable.cupomId });

    /*
     * Devolve o uso do cupom.
     *
     * Sem isto a contagem só sobe: um atendimento lançado por engano e apagado
     * em seguida consumiria um uso para sempre. Num cupom com limite de 50, uma
     * dúzia de correções esgotaria a promoção antes da hora, e ninguém ligaria
     * uma coisa à outra.
     *
     * O `greatest(...,0)` protege contra ficar negativo se alguém zerar o
     * contador na mão pelo painel.
     */
    if (removido?.cupomId != null) {
      await tx
        .update(couponsTable)
        .set({ usoAtual: sql`greatest(${couponsTable.usoAtual} - 1, 0)` })
        .where(eq(couponsTable.id, removido.cupomId));
    }

    return [removido];
  });

  // Sem isso o cliente ficaria com uma visita a mais e um `ultimoAtendimento`
  // apontando para o atendimento que acabou de ser removido.
  if (deleted) await syncClientRecallCache(deleted.clienteId, barbershopId);

  res.sendStatus(204);
});

export default router;
