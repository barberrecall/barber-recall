import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatBRL, formatMoney, parseMoney } from "./money";

/**
 * Conversão de dinheiro. Errar para menos irrita o cliente no balcão; errar
 * para mais tira do caixa da barbearia sem ninguém perceber, porque o valor
 * sai plausível na tela e só destoa no fechamento do mês.
 */

describe("parseMoney", () => {
  test("número inteiro", () => {
    assert.equal(parseMoney("45"), 45);
  });

  test("vírgula como separador decimal — o jeito brasileiro", () => {
    assert.equal(parseMoney("45,50"), 45.5);
    assert.equal(parseMoney("45,5"), 45.5);
  });

  test("ponto como separador decimal — o que o teclado de alguns aparelhos dá", () => {
    assert.equal(parseMoney("45.50"), 45.5);
  });

  test("milhar com ponto e decimal com vírgula", () => {
    assert.equal(parseMoney("1.234,56"), 1234.56);
    assert.equal(parseMoney("12.345,00"), 12345);
  });

  test("milhar sem decimal não vira centavo", () => {
    // "1.500" digitado é mil e quinhentos. Lido como decimal daria R$ 1,50 —
    // mil vezes menos, e plausível demais para alguém notar no balcão.
    assert.equal(parseMoney("1.500"), 1500);
    assert.equal(parseMoney("1.234"), 1234);
  });

  test("aceita o símbolo e espaços colados", () => {
    assert.equal(parseMoney("R$ 45,90"), 45.9);
    assert.equal(parseMoney(" 45 "), 45);
  });

  test("vazio não vira zero", () => {
    // Zero é desconto legítimo. Confundir "não consegui ler" com "vale zero"
    // esconde erro de digitação atrás de um número que parece intencional.
    assert.ok(Number.isNaN(parseMoney("")));
    assert.ok(Number.isNaN(parseMoney("   ")));
  });

  test("texto não vira número", () => {
    for (const v of ["abc", "R$", "--", "4a5"]) {
      assert.ok(Number.isNaN(parseMoney(v)), `deveria recusar: ${v}`);
    }
  });

  test("não aceita valor pela metade", () => {
    // parseFloat("45.50.30") devolve 45.5 sozinho: lê até onde entende e
    // descarta o resto, sem avisar. Aqui é recusa.
    assert.ok(Number.isNaN(parseMoney("45.50.30")));
    assert.ok(Number.isNaN(parseMoney("45,50,30")));
  });

  test("negativo é recusado", () => {
    assert.ok(Number.isNaN(parseMoney("-10")));
  });

  test("não-string não derruba", () => {
    for (const v of [null, undefined, 45, {}, []]) {
      assert.ok(Number.isNaN(parseMoney(v as unknown as string)));
    }
  });

  test("zero é valor válido, não ausência", () => {
    assert.equal(parseMoney("0"), 0);
    assert.equal(parseMoney("0,00"), 0);
  });
});

describe("formatMoney", () => {
  test("sempre duas casas, com vírgula", () => {
    assert.equal(formatMoney(45), "45,00");
    assert.equal(formatMoney(45.5), "45,50");
    assert.equal(formatMoney(0), "0,00");
  });

  test("milhar com ponto", () => {
    assert.equal(formatMoney(1234.56), "1.234,56");
  });

  test("valor inválido não vira 'NaN' na tela", () => {
    assert.equal(formatMoney(Number.NaN), "0,00");
    assert.equal(formatMoney(Number.POSITIVE_INFINITY), "0,00");
  });
});

describe("formatBRL", () => {
  test("símbolo e espaço comum, não o não-quebrável do Intl", () => {
    const saida = formatBRL(45.5);
    assert.equal(saida, "R$ 45,50");
    assert.ok(!saida.includes(" "), "não deve sobrar espaço não-quebrável");
  });

  test("milhar", () => {
    assert.equal(formatBRL(1234.56), "R$ 1.234,56");
  });

  test("valor inválido não vira 'R$ NaN' na tela", () => {
    assert.equal(formatBRL(Number.NaN), "R$ 0,00");
  });
});

describe("ida e volta", () => {
  test("formatar e ler de volta devolve o mesmo valor", () => {
    // O campo formata ao sair do foco; se reabrir para editar, o valor lido
    // tem que ser o mesmo, senão o número muda sozinho a cada edição.
    for (const v of [0, 45, 45.5, 45.9, 1234.56, 12345]) {
      assert.equal(parseMoney(formatMoney(v)), v, `ida e volta de ${v}`);
    }
  });
});
