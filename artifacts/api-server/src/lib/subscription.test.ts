import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { chaveDoPeriodo } from "./subscription";

/**
 * A propriedade que estes testes protegem vale dinheiro: duas notificações do
 * mesmo mês pago precisam produzir a MESMA chave, e meses diferentes precisam
 * produzir chaves diferentes.
 *
 * Se a primeira condição quebrar, cada assinatura autorizada concede 60 dias
 * por 30 pagos — e ninguém percebe, porque o cliente não reclama de ganhar
 * acesso a mais. Se a segunda quebrar, a renovação do mês seguinte é ignorada e
 * o cliente que pagou é bloqueado.
 */

describe("chaveDoPeriodo", () => {
  test("mesma assinatura e mesmo mês produzem a mesma chave", () => {
    // Cenário real: a autorização chega dia 1º, a fatura daquele mês dia 3.
    const a = chaveDoPeriodo("preap-1", new Date("2026-08-01T10:00:00Z"));
    const b = chaveDoPeriodo("preap-1", new Date("2026-08-03T22:41:07Z"));
    assert.equal(a, b);
  });

  test("meses diferentes produzem chaves diferentes", () => {
    const agosto = chaveDoPeriodo("preap-1", new Date("2026-08-28T00:00:00Z"));
    const setembro = chaveDoPeriodo("preap-1", new Date("2026-09-01T00:00:00Z"));
    assert.notEqual(agosto, setembro);
  });

  test("a virada do ano não colide", () => {
    // Se a chave usasse só o mês, dezembro/2026 e dezembro/2027 seriam a mesma
    // coisa e a renovação anual seguinte seria ignorada.
    const dez2026 = chaveDoPeriodo("preap-1", new Date("2026-12-15T00:00:00Z"));
    const dez2027 = chaveDoPeriodo("preap-1", new Date("2027-12-15T00:00:00Z"));
    assert.notEqual(dez2026, dez2027);
  });

  test("assinaturas diferentes no mesmo mês não colidem", () => {
    // Duas barbearias assinando no mesmo mês são dois clientes distintos.
    const a = chaveDoPeriodo("preap-1", new Date("2026-08-10T00:00:00Z"));
    const b = chaveDoPeriodo("preap-2", new Date("2026-08-10T00:00:00Z"));
    assert.notEqual(a, b);
  });

  test("extremos do mês caem no mesmo período", () => {
    const primeiro = chaveDoPeriodo("preap-1", new Date("2026-08-01T00:00:00.000Z"));
    const ultimo = chaveDoPeriodo("preap-1", new Date("2026-08-31T23:59:59.999Z"));
    assert.equal(primeiro, ultimo);
  });

  test("a chave carrega o id da assinatura, para o log ser legível", () => {
    // Quando algo der errado, quem lê o log precisa saber de qual assinatura a
    // linha fala sem ter que decodificar nada.
    assert.equal(chaveDoPeriodo("preap-abc", new Date("2026-08-10T00:00:00Z")), "preap-abc:2026-08");
  });
});
