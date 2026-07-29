/**
 * Regras de resgate de cupom.
 *
 * Separadas das rotas para poderem ser testadas sem banco: são cálculo de
 * dinheiro, e um engano aqui cobra do cliente errado ou dá desconto que a
 * barbearia não autorizou.
 */

export type Cupom = {
  id: number;
  codigo: string;
  tipo: string; // "percent" | "fixed"
  valor: string; // numeric do Postgres chega como texto
  validade: string | null; // "YYYY-MM-DD"
  ativo: boolean;
  usoMaximo: number | null;
  usoAtual: number;
};

export type ResultadoCupom =
  | { ok: true; desconto: number }
  | { ok: false; motivo: string };

/**
 * Desconto que o cupom concede sobre um valor.
 *
 * Nunca passa do valor do atendimento: um cupom de R$ 50 num corte de R$ 40 dá
 * R$ 40 de desconto, não R$ 50. Sem esse teto o `valorFinal` ficaria negativo e
 * o faturamento do dia seria comido por um corte que deveria ser só gratuito.
 */
export function descontoDoCupom(cupom: Cupom, valor: number): number {
  const v = parseFloat(cupom.valor);
  if (!Number.isFinite(v) || v <= 0) return 0;

  const bruto = cupom.tipo === "percent" ? (valor * v) / 100 : v;

  // Duas casas: dinheiro. Sem o arredondamento, 33% de 40 vira 13.200000000001
  // e a coluna numeric(10,2) trunca de um jeito que não bate com a tela.
  return Math.min(Math.round(bruto * 100) / 100, valor);
}

/**
 * Decide se o cupom pode ser usado agora, e por quanto.
 *
 * Cada recusa tem motivo próprio: "cupom vencido" e "cupom esgotado" pedem
 * ações diferentes de quem está no balcão com o cliente esperando, e uma
 * mensagem genérica obrigaria o barbeiro a adivinhar.
 *
 * @param hojeLocal - data de hoje no fuso da barbearia, "YYYY-MM-DD". Vem de
 *   fora porque comparar validade com `new Date()` usaria o fuso do processo,
 *   que é UTC — um cupom válido até hoje seria recusado a partir das 21h.
 */
export function validarCupom(
  cupom: Cupom | undefined,
  valor: number,
  hojeLocal: string,
): ResultadoCupom {
  if (!cupom) return { ok: false, motivo: "Cupom não encontrado." };
  if (!cupom.ativo) return { ok: false, motivo: "Este cupom está desativado." };

  // Comparação de texto funciona porque "YYYY-MM-DD" ordena
  // lexicograficamente igual à ordem cronológica.
  if (cupom.validade && cupom.validade < hojeLocal) {
    return { ok: false, motivo: `Cupom vencido em ${cupom.validade.split("-").reverse().join("/")}.` };
  }

  if (cupom.usoMaximo !== null && cupom.usoAtual >= cupom.usoMaximo) {
    return { ok: false, motivo: `Cupom esgotado (limite de ${cupom.usoMaximo} usos).` };
  }

  return { ok: true, desconto: descontoDoCupom(cupom, valor) };
}
