import { and, eq, lte, sql, type SQL } from "drizzle-orm";
import { db, barbershopTable, clientsTable, appointmentsTable } from "@workspace/db";

/**
 * Fonte de verdade única do status de recall (skill `client-recall-logic`).
 * Dashboard, Clientes, Campanhas e Relatórios devem sempre passar por aqui —
 * nunca recalcular a regra localmente.
 */

/** Escada de status, do mais saudável ao mais frio. */
export const RECALL_STATUSES = ["active", "awaiting_return", "at_risk"] as const;
export type RecallStatus = (typeof RECALL_STATUSES)[number];

export const isRecallStatus = (v: string): v is RecallStatus =>
  (RECALL_STATUSES as readonly string[]).includes(v);

/** Tolerância, em dias, entre o fim do intervalo de retorno e o cliente virar `at_risk`. */
export const MARGEM_RETORNO_DIAS = 7;

/** Fallback quando a barbearia não tem `diasRetorno` configurado. */
const DIAS_RETORNO_PADRAO = 30;

/** Intervalo de retorno esperado (em dias) configurado pela barbearia. */
export async function getDiasRetorno(barbershopId: number): Promise<number> {
  const [shop] = await db
    .select({ diasRetorno: barbershopTable.diasRetorno })
    .from(barbershopTable)
    .where(eq(barbershopTable.id, barbershopId));
  return shop?.diasRetorno ?? DIAS_RETORNO_PADRAO;
}

/**
 * Status derivado do histórico — a coluna `clients.status` é só um cache e nunca
 * é lida para decidir o status.
 *
 * Referência = último atendimento; para quem nunca foi atendido, a data de
 * cadastro (um cliente cadastrado hoje é `active`, um cadastrado há meses e
 * nunca atendido é `at_risk`).
 */
export function recallStatusSql(diasRetorno: number): SQL<RecallStatus> {
  const limiteRisco = diasRetorno + MARGEM_RETORNO_DIAS;
  const referencia = sql`coalesce(${clientsTable.ultimoAtendimento}, ${clientsTable.createdAt})`;
  return sql<RecallStatus>`case
    when ${referencia} >= now() - make_interval(days => ${diasRetorno}::int) then 'active'
    when ${referencia} >= now() - make_interval(days => ${limiteRisco}::int) then 'awaiting_return'
    else 'at_risk'
  end`;
}

/**
 * Clientes que precisam de contato agora — `awaiting_return` ou `at_risk`.
 *
 * Usado pelas Campanhas para montar os "Disparos de hoje". As campanhas ainda
 * afinam por cima disso com o `campaign.dias` próprio, mas o recall é o piso:
 * ninguém que a barbearia considera `active` entra num disparo de retorno.
 */
export function needsRecallContactSql(diasRetorno: number): SQL {
  return sql`${recallStatusSql(diasRetorno)} in ('awaiting_return', 'at_risk')`;
}

/** Contagem de clientes por status derivado, para os KPIs do Dashboard. */
export async function countByRecallStatus(
  barbershopId: number,
  diasRetorno: number,
): Promise<Record<RecallStatus, number>> {
  const statusSql = recallStatusSql(diasRetorno);
  const rows = await db
    .select({ status: statusSql, count: sql<number>`count(*)` })
    .from(clientsTable)
    .where(eq(clientsTable.barbershopId, barbershopId))
    // Agrupa pelo ordinal, não repetindo a expressão. Passar `statusSql` aqui
    // faz o drizzle emitir o CASE uma segunda vez com outros placeholders
    // ($4/$5 em vez de $1/$2); o Postgres compara as expressões sintaticamente,
    // não as reconhece como iguais e rejeita a query com
    // "column clients.ultimo_atendimento must appear in the GROUP BY clause".
    .groupBy(sql`1`);

  const counts: Record<RecallStatus, number> = { active: 0, awaiting_return: 0, at_risk: 0 };
  for (const row of rows) {
    if (isRecallStatus(row.status)) counts[row.status] = Number(row.count);
  }
  return counts;
}

/**
 * Recalcula os campos de recall em `clients` a partir dos atendimentos.
 *
 * Deve ser chamada depois de criar, editar ou remover um atendimento.
 *
 * Recalcula em vez de incrementar/decrementar de propósito: contadores
 * incrementais só ficam certos se todo caminho de escrita lembrar de ajustá-los
 * — e não lembravam (remover um atendimento deixava `totalVisitas` inflado e
 * `ultimoAtendimento` apontando pra um registro apagado). Recalcular é
 * autocorretivo e conserta dados já inconsistentes na primeira escrita.
 *
 * O `data <= now()` é a regra central: um atendimento com data futura não conta
 * como visita e não pode marcar o cliente como `active` antes de ele aparecer.
 * É o mesmo corte que `janelasEntreVisitas` usa nas métricas, então status e
 * taxa de retorno passam a concordar sobre o que é uma visita.
 */
export async function syncClientRecallCache(
  clienteId: number,
  barbershopId: number,
): Promise<void> {
  const diasRetorno = await getDiasRetorno(barbershopId);
  const limiteRisco = diasRetorno + MARGEM_RETORNO_DIAS;

  await db.execute(sql`
    update ${clientsTable} set
      ultimo_atendimento = sub.ultimo,
      total_visitas = sub.total,
      status = case
        when coalesce(sub.ultimo, ${clientsTable.createdAt}) >= now() - make_interval(days => ${diasRetorno}::int) then 'active'
        when coalesce(sub.ultimo, ${clientsTable.createdAt}) >= now() - make_interval(days => ${limiteRisco}::int) then 'awaiting_return'
        else 'at_risk'
      end
    from (
      select max(${appointmentsTable.data}) as ultimo,
             count(*) as total
      from ${appointmentsTable}
      where ${appointmentsTable.clienteId} = ${clienteId}
        and ${appointmentsTable.barbershopId} = ${barbershopId}
        and ${appointmentsTable.data} <= now()
    ) sub
    where ${clientsTable.id} = ${clienteId}
      and ${clientsTable.barbershopId} = ${barbershopId}
  `);
}

/**
 * CTEs base das métricas de retorno: uma linha por visita, com o dia da visita
 * (`dia`) e o dia da visita seguinte do mesmo cliente (`proxima`, `null`
 * enquanto o cliente não voltou).
 *
 * Visitas no mesmo dia contam como uma só e agendamentos futuros são ignorados.
 * Quem quiser usar precisa selecionar de `janelas` logo depois.
 */
function janelasEntreVisitas(barbershopId: number): SQL {
  return sql`
    with visitas as (
      select distinct ${appointmentsTable.clienteId} as cliente_id,
                      date_trunc('day', ${appointmentsTable.data}) as dia
      from ${appointmentsTable}
      where ${and(
        eq(appointmentsTable.barbershopId, barbershopId),
        lte(appointmentsTable.data, sql`now()`),
      )}
    ),
    janelas as (
      select dia, lead(dia) over (partition by cliente_id order by dia) as proxima
      from visitas
    )
  `;
}

/**
 * Taxa de retorno por janelas fechadas.
 *
 * Cada atendimento abre uma janela de `diasRetorno`. A janela entra na conta
 * quando já fechou — ou porque o cliente voltou, ou porque o prazo venceu —
 * e conta como retorno no prazo só quando a volta aconteceu dentro dele.
 * Assim clientes que ainda estão dentro do prazo ficam fora do denominador.
 */
export function taxaRetornoQuery(barbershopId: number, diasRetorno: number): SQL {
  const intervalo = sql`make_interval(days => ${diasRetorno}::int)`;
  return sql`
    ${janelasEntreVisitas(barbershopId)}
    select
      count(*) filter (where proxima is not null and proxima - dia <= ${intervalo}) as em_prazo,
      count(*) as fechadas
    from janelas
    where proxima is not null or dia < now() - ${intervalo}
  `;
}

export async function getTaxaRetorno(barbershopId: number, diasRetorno: number): Promise<number> {
  const result = await db.execute(taxaRetornoQuery(barbershopId, diasRetorno));

  const [row] = result.rows as { em_prazo: string | number; fechadas: string | number }[];
  const fechadas = Number(row?.fechadas ?? 0);
  if (fechadas === 0) return 0;
  return Math.round((Number(row?.em_prazo ?? 0) / fechadas) * 100);
}

/**
 * Retorno médio: média de dias entre atendimentos consecutivos.
 *
 * Só entram as janelas que já tiveram retorno (`proxima is not null`) — uma
 * janela ainda aberta não tem intervalo pra medir. Por consequência, apenas
 * clientes recorrentes (dois ou mais dias de visita) pesam na média.
 *
 * Diferente da taxa de retorno, essa métrica não depende de `diasRetorno`: ela
 * mede o ritmo real dos clientes, não a aderência ao intervalo configurado.
 *
 * O intervalo vai por `epoch` em vez de `extract(day from ...)` porque `data` é
 * `timestamptz`: numa virada de horário de verão a diferença entre dois dias
 * truncados pode dar 23h ou 25h, e o `extract(day)` truncaria o dia quebrado.
 */
export function retornoMedioQuery(barbershopId: number): SQL {
  return sql`
    ${janelasEntreVisitas(barbershopId)}
    select avg(extract(epoch from (proxima - dia)) / 86400) as dias
    from janelas
    where proxima is not null
  `;
}

/** Retorno médio em dias inteiros; 0 quando ninguém voltou ainda. */
export async function getRetornoMedio(barbershopId: number): Promise<number> {
  const result = await db.execute(retornoMedioQuery(barbershopId));

  const [row] = result.rows as { dias: string | number | null }[];
  if (row?.dias == null) return 0;
  return Math.round(Number(row.dias));
}
