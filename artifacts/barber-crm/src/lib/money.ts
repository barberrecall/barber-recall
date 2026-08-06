/**
 * Dinheiro em real: como o barbeiro digita e como ele lê.
 *
 * O CRM web nasceu com `type="number"` cru e `toFixed(2)`, que produz
 * "R$ 45.00" — pontuação de língua inglesa. Quem fecha o caixa em português lê
 * "R$ 45,00", e o app móvel já fazia assim; só o web destoava.
 *
 * Separado das telas para poder ser testado sem navegador: é conversão de
 * dinheiro, e errar aqui cobra o valor errado do cliente no balcão.
 */

const MOEDA = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const DECIMAL = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * "R$ 45,00" — para exibir na tela.
 *
 * O Intl separa o símbolo com espaço não-quebrável (U+00A0). Trocado por
 * espaço comum: o não-quebrável é invisível na tela mas atrapalha comparação
 * de texto, e já custou tempo em teste de outra base.
 */
export function formatBRL(valor: number): string {
  return MOEDA.format(Number.isFinite(valor) ? valor : 0).replace(/\u00A0/g, " ");
}

/** "45,00" — sem símbolo, para dentro de campo que já mostra o R$. */
export function formatMoney(valor: number): string {
  return DECIMAL.format(Number.isFinite(valor) ? valor : 0);
}

/**
 * Lê o que foi digitado. Aceita "45", "45,50", "45.50" e "1.234,56".
 *
 * Devolve NaN para entrada que não é número, em vez de 0: zero é um valor
 * legítimo de desconto, então confundir "não consegui ler" com "vale zero"
 * esconderia erro de digitação atrás de um número plausível.
 */
export function parseMoney(texto: string): number {
  if (typeof texto !== "string") return Number.NaN;

  const limpo = texto.replace(/[R$\s]/g, "");
  if (!limpo) return Number.NaN;

  let normalizado: string;

  if (limpo.includes(",")) {
    // Com vírgula, ela é o separador decimal e os pontos são de milhar.
    normalizado = limpo.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpo)) {
    // Só ponto, em grupos de três: é milhar. Quem digita mil e quinhentos
    // escreve "1.500" — sem esta distinção o caixa registraria R$ 1,50, mil
    // vezes menos, e o valor sai plausível demais para alguém notar na hora.
    normalizado = limpo.replace(/\./g, "");
  } else {
    // Só ponto, fora daquele formato: é decimal ("45.50").
    normalizado = limpo;
  }

  const numero = Number.parseFloat(normalizado);

  // parseFloat("45.50.30") devolve 45.5 em vez de recusar — lê até onde
  // entende e ignora o resto. Confere o texto inteiro para não aceitar
  // silenciosamente um valor pela metade.
  if (!/^\d*\.?\d*$/.test(normalizado)) return Number.NaN;

  return Number.isFinite(numero) ? numero : Number.NaN;
}
