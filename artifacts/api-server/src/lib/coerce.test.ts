import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { nullIfBlank, nullableInt, requiredNumber, requiredDate } from "./coerce";

/**
 * Estes testes existem por causa de um bug real: doze campos em quatro rotas
 * mandavam string vazia para colunas `date`, `integer` e `numeric`, e o Postgres
 * derrubava a query inteira com 500. O usuário via "erro no servidor" ao tentar
 * apagar uma data de nascimento.
 *
 * A parte difícil não é rejeitar o vazio, é distinguir os três estados que um
 * formulário produz e que o resto do código trata de forma diferente:
 *
 *   ausente (undefined)  -> não mexer neste campo
 *   vazio ("")           -> limpar, se a coluna aceita null; erro, se não aceita
 *   preenchido           -> converter
 *
 * Confundir "ausente" com "vazio" apaga dado que ninguém pediu para apagar.
 */

describe("nullIfBlank — colunas nuláveis", () => {
  test("ausente devolve undefined, para o update não incluir o campo", () => {
    assert.equal(nullIfBlank(undefined), undefined);
  });

  test("vazio vira null, que é o pedido de limpar", () => {
    assert.equal(nullIfBlank(""), null);
    assert.equal(nullIfBlank(null), null);
  });

  test("só espaços conta como vazio", () => {
    assert.equal(nullIfBlank("   "), null);
  });

  test("valor preenchido passa intacto", () => {
    assert.equal(nullIfBlank("texto"), "texto");
  });

  test("zero e false não são vazio", () => {
    // Regressão clássica de checagem por falsy: `0` é um valor legítimo em
    // coluna numérica nulável, e apagá-lo silenciosamente seria pior que o 500.
    assert.equal(nullIfBlank(0), 0);
    assert.equal(nullIfBlank(false), false);
  });
});

describe("nullableInt — inteiro em coluna nulável", () => {
  test("vazio vira null sem acusar erro", () => {
    const erros: string[] = [];
    assert.equal(nullableInt("", "barbeiroId", erros), null);
    assert.deepEqual(erros, []);
  });

  test("texto que não é número acumula erro e não chega ao banco", () => {
    const erros: string[] = [];
    assert.equal(nullableInt("abc", "barbeiroId", erros), undefined);
    assert.equal(erros.length, 1);
    assert.match(erros[0]!, /barbeiroId/);
  });

  test("decimal é recusado onde a coluna é inteira", () => {
    const erros: string[] = [];
    assert.equal(nullableInt("1.5", "barbeiroId", erros), undefined);
    assert.equal(erros.length, 1);
  });

  test("número em texto é convertido", () => {
    const erros: string[] = [];
    assert.equal(nullableInt("42", "barbeiroId", erros), 42);
    assert.deepEqual(erros, []);
  });
});

describe("requiredNumber — coluna NOT NULL", () => {
  test("vazio é erro, não null", () => {
    // Mandar null aqui violaria a restrição e trocaria um 500 por outro. Foi
    // exatamente esse o engano do primeiro diagnóstico deste bug.
    const erros: string[] = [];
    assert.equal(requiredNumber("", "valor", erros), undefined);
    assert.equal(erros.length, 1);
    assert.match(erros[0]!, /não pode ficar vazio/);
  });

  test("ausente não é erro — quem não quer mudar o campo não o envia", () => {
    const erros: string[] = [];
    assert.equal(requiredNumber(undefined, "valor", erros), undefined);
    assert.deepEqual(erros, []);
  });

  test("respeita o mínimo", () => {
    const erros: string[] = [];
    assert.equal(requiredNumber("0", "diasRetorno", erros, { min: 1 }), undefined);
    assert.match(erros[0]!, /menor que 1/);
  });

  test("aceita decimal quando a coluna não é inteira", () => {
    const erros: string[] = [];
    assert.equal(requiredNumber("69.90", "valor", erros), 69.9);
    assert.deepEqual(erros, []);
  });

  test("recusa infinito e NaN", () => {
    const erros: string[] = [];
    assert.equal(requiredNumber("Infinity", "valor", erros), undefined);
    assert.equal(requiredNumber("abc", "valor", erros), undefined);
    assert.equal(erros.length, 2);
  });

  test("zero passa quando não há mínimo", () => {
    const erros: string[] = [];
    assert.equal(requiredNumber("0", "desconto", erros), 0);
    assert.deepEqual(erros, []);
  });
});

describe("requiredDate", () => {
  test("data inválida é recusada antes do banco", () => {
    // `new Date("qualquer coisa")` devolve Invalid Date em silêncio e só
    // estoura na inserção — é o caso que este utilitário existe para pegar.
    const erros: string[] = [];
    assert.equal(requiredDate("qualquer coisa", "data", erros), undefined);
    assert.match(erros[0]!, /não é uma data válida/);
  });

  test("vazio é erro de validação", () => {
    const erros: string[] = [];
    assert.equal(requiredDate("", "data", erros), undefined);
    assert.match(erros[0]!, /não pode ficar vazio/);
  });

  test("ISO válido vira Date", () => {
    const erros: string[] = [];
    const d = requiredDate("2026-07-28T14:30:00.000Z", "data", erros);
    assert.deepEqual(erros, []);
    assert.equal(d?.toISOString(), "2026-07-28T14:30:00.000Z");
  });
});
