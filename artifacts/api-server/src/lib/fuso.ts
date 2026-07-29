import { sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

/**
 * Fuso horário usado para decidir a que DIA um instante pertence.
 *
 * ── O problema que isto resolve ─────────────────────────────────────────────
 *
 * Os horários são gravados como `timestamptz`, o que está certo: o instante é
 * absoluto e não depende de onde alguém está. Mas "quantos atendimentos hoje" e
 * "a agenda do dia 28" são perguntas sobre o CALENDÁRIO de quem pergunta, não
 * sobre instantes.
 *
 * O servidor roda em UTC e o banco também. Sem conversão, o dia começa à
 * meia-noite de Londres — que é 21:00 do dia anterior em Mossoró. Na prática,
 * todo atendimento registrado entre 21:00 e meia-noite aparecia no dia
 * seguinte: a agenda do dia 28 ficava vazia e o corte das 22:50 surgia no 29.
 *
 * ── Por que uma constante, e não uma coluna por barbearia ───────────────────
 *
 * O produto é brasileiro de ponta a ponta — PIX, Mercado Pago, CPF, português.
 * A esmagadora maioria do país está em UTC−3, e o Brasil não tem horário de
 * verão desde 2019, então `America/Sao_Paulo` acerta para quase todo mundo.
 *
 * A exceção é real e está registrada: barbearias no Amazonas (UTC−4), no Acre
 * (UTC−5) ou em Fernando de Noronha (UTC−2) verão o corte do dia deslocado em
 * uma a duas horas. Quando a primeira delas assinar, isto vira uma coluna em
 * `barbershop` e um campo em Configurações — e esta constante passa a ser
 * apenas o padrão.
 */
export const FUSO_BARBEARIA = "America/Sao_Paulo";

/**
 * A data local de um `timestamptz`, para comparar ou agrupar por dia.
 *
 * `AT TIME ZONE` converte o instante para a hora de parede do fuso; o `::date`
 * então descarta a hora. Fazer o `::date` direto na coluna usaria o fuso da
 * sessão do banco, que é GMT — a causa do defeito descrito acima.
 */
export function diaLocal(coluna: PgColumn): SQL<string> {
  return sql<string>`((${coluna} AT TIME ZONE ${sql.raw(`'${FUSO_BARBEARIA}'`)})::date)`;
}

/** O dia de hoje no fuso da barbearia, para comparar com `diaLocal`. */
export function hojeLocal(): SQL<string> {
  return sql<string>`((now() AT TIME ZONE ${sql.raw(`'${FUSO_BARBEARIA}'`)})::date)`;
}

/**
 * O dia da semana local (0 = domingo), para descobrir o melhor dia de campanha.
 *
 * Sem a conversão, um corte de sábado às 22h contaria como domingo — e a
 * sugestão de "melhor dia para campanha" apontaria o dia errado justamente para
 * as barbearias que trabalham até tarde, que são a maioria.
 */
export function diaDaSemanaLocal(coluna: PgColumn): SQL<number> {
  return sql<number>`extract(dow from (${coluna} AT TIME ZONE ${sql.raw(`'${FUSO_BARBEARIA}'`)}))::int`;
}
