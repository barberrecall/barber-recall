/**
 * Converte o `ts` da assinatura do webhook do Mercado Pago para milissegundos.
 *
 * O Mercado Pago envia epoch em **segundos**. O `toleranceSeconds` do SDK
 * compara o valor cru com `Date.now()`, que é milissegundos — a conta dá mais de
 * cinquenta anos de deriva e a janela de tempo reprova sempre. Na prática isso
 * significava recusar 100% das notificações reais: o cliente pagava, o dinheiro
 * entrava, e o acesso nunca liberava.
 *
 * O defeito passou por todos os testes sintéticos porque todos assinavam em
 * milissegundos, que é a unidade conveniente para quem escreve o teste em
 * JavaScript. Quem pegou foi uma notificação simulada pelo painel do Mercado
 * Pago, num servidor cujo relógio estava a três segundos do certo.
 *
 * Aceita as duas unidades em vez de assumir segundos: se o Mercado Pago mudar,
 * ou se o SDK passar a normalizar, isto continua correto. Epoch em segundos tem
 * 10 dígitos até o ano 2286; em milissegundos, 13.
 */
export function tsParaMs(ts: string): number {
  const n = Number(ts);
  return ts.length <= 11 ? n * 1000 : n;
}
