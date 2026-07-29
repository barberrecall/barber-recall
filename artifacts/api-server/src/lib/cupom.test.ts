import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { descontoDoCupom, validarCupom, type Cupom } from "./cupom";

/**
 * Cálculo de desconto é cálculo de dinheiro. Errar para menos irrita o cliente
 * no balcão; errar para mais tira do caixa da barbearia sem ninguém perceber,
 * porque o valor sai "certo" na tela e só destoa no fechamento do mês.
 */

const base: Cupom = {
  id: 1,
  codigo: "TESTE",
  tipo: "percent",
  valor: "10",
  validade: null,
  ativo: true,
  usoMaximo: null,
  usoAtual: 0,
};

const cupom = (campos: Partial<Cupom>): Cupom => ({ ...base, ...campos });

describe("descontoDoCupom", () => {
  test("percentual", () => {
    assert.equal(descontoDoCupom(cupom({ tipo: "percent", valor: "10" }), 100), 10);
    assert.equal(descontoDoCupom(cupom({ tipo: "percent", valor: "50" }), 80), 40);
  });

  test("valor fixo", () => {
    assert.equal(descontoDoCupom(cupom({ tipo: "fixed", valor: "15" }), 100), 15);
  });

  test("nunca passa do valor do atendimento", () => {
    // Um cupom de R$ 50 num corte de R$ 40 dá R$ 40, não R$ 50. Sem o teto o
    // valorFinal ficaria negativo e comeria o faturamento do dia.
    assert.equal(descontoDoCupom(cupom({ tipo: "fixed", valor: "50" }), 40), 40);
    assert.equal(descontoDoCupom(cupom({ tipo: "percent", valor: "150" }), 40), 40);
  });

  test("arredonda para duas casas", () => {
    // 33% de 40 dá 13.200000000000001 em ponto flutuante. A coluna é
    // numeric(10,2) e a tela mostra duas casas: sem arredondar aqui, banco e
    // tela discordam por centavos.
    assert.equal(descontoDoCupom(cupom({ tipo: "percent", valor: "33" }), 40), 13.2);
    assert.equal(descontoDoCupom(cupom({ tipo: "percent", valor: "33.33" }), 99.99), 33.33);
  });

  test("valor inválido não vira desconto", () => {
    for (const v of ["", "abc", "0", "-10"]) {
      assert.equal(descontoDoCupom(cupom({ valor: v }), 100), 0, `valor ${v}`);
    }
  });
});

describe("validarCupom", () => {
  const HOJE = "2026-07-29";

  test("cupom inexistente", () => {
    const r = validarCupom(undefined, 100, HOJE);
    assert.equal(r.ok, false);
  });

  test("desativado", () => {
    const r = validarCupom(cupom({ ativo: false }), 100, HOJE);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.motivo, /desativado/i);
  });

  test("vencido ontem", () => {
    const r = validarCupom(cupom({ validade: "2026-07-28" }), 100, HOJE);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.motivo, /vencido/i);
  });

  test("válido HOJE ainda vale", () => {
    // A fronteira que mais aparece na prática: o cliente chega no último dia da
    // promoção. Recusar aqui seria recusar quem tem direito.
    assert.equal(validarCupom(cupom({ validade: HOJE }), 100, HOJE).ok, true);
  });

  test("sem validade nunca vence", () => {
    assert.equal(validarCupom(cupom({ validade: null }), 100, HOJE).ok, true);
  });

  test("esgotado no limite", () => {
    assert.equal(validarCupom(cupom({ usoMaximo: 5, usoAtual: 4 }), 100, HOJE).ok, true);
    const r = validarCupom(cupom({ usoMaximo: 5, usoAtual: 5 }), 100, HOJE);
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.motivo, /esgotado/i);
  });

  test("sem limite nunca esgota", () => {
    assert.equal(validarCupom(cupom({ usoMaximo: null, usoAtual: 9999 }), 100, HOJE).ok, true);
  });

  test("cada recusa tem motivo próprio", () => {
    // Quem está no balcão com o cliente esperando precisa saber se pede outro
    // cupom, se a promoção acabou ou se digitou errado — e "cupom inválido"
    // não distingue nenhuma das três.
    const motivos = [
      validarCupom(undefined, 100, HOJE),
      validarCupom(cupom({ ativo: false }), 100, HOJE),
      validarCupom(cupom({ validade: "2020-01-01" }), 100, HOJE),
      validarCupom(cupom({ usoMaximo: 1, usoAtual: 1 }), 100, HOJE),
    ].map((r) => (r.ok ? "" : r.motivo));

    assert.equal(new Set(motivos).size, 4, `motivos repetidos: ${motivos.join(" | ")}`);
  });

  test("devolve o desconto quando aceita", () => {
    const r = validarCupom(cupom({ tipo: "percent", valor: "25" }), 200, HOJE);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.desconto, 50);
  });
});
