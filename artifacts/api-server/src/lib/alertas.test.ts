import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { _assinatura, _limparTravas } from "./alertas";

/**
 * O agrupamento é o que decide se o aviso é útil ou insuportável.
 *
 * Agrupar de menos inunda a caixa de entrada, a pessoa cria um filtro e para de
 * ver todos os avisos — inclusive os importantes. Agrupar demais esconde
 * problemas diferentes atrás do primeiro que apareceu.
 */

beforeEach(() => {
  _limparTravas();
});

function erroCom(nome: string, mensagem: string, pilha?: string): Error {
  const e = new Error(mensagem);
  e.name = nome;
  if (pilha !== undefined) e.stack = pilha;
  return e;
}

describe("assinatura de erro", () => {
  test("o mesmo erro produz a mesma assinatura", () => {
    const pilha = "Error: x\n    at rota (/app/dist/index.mjs:100:5)";
    assert.equal(
      _assinatura(erroCom("TypeError", "x is not a function", pilha)),
      _assinatura(erroCom("TypeError", "x is not a function", pilha)),
    );
  });

  test("mensagens diferentes são problemas diferentes", () => {
    // Dois TypeError distintos não podem ser agrupados: consertar um não
    // conserta o outro, e o segundo ficaria escondido por uma hora.
    const pilha = "Error\n    at rota (/app/dist/index.mjs:100:5)";
    assert.notEqual(
      _assinatura(erroCom("TypeError", "a is not a function", pilha)),
      _assinatura(erroCom("TypeError", "b is not a function", pilha)),
    );
  });

  test("origens diferentes são problemas diferentes", () => {
    // A mesma mensagem vinda de dois lugares do código são duas causas.
    assert.notEqual(
      _assinatura(erroCom("Error", "falhou", "Error\n    at a (/app/x.mjs:1:1)")),
      _assinatura(erroCom("Error", "falhou", "Error\n    at b (/app/y.mjs:9:9)")),
    );
  });

  test("o resto da pilha não quebra o agrupamento", () => {
    // Quadros abaixo do primeiro variam com o caminho da requisição. Se
    // entrassem na conta, a MESMA falha viraria um aviso novo a cada
    // requisição — exatamente a inundação que as travas existem para evitar.
    const a = "Error\n    at falha (/app/x.mjs:1:1)\n    at rotaA (/app/a.mjs:2:2)";
    const b = "Error\n    at falha (/app/x.mjs:1:1)\n    at rotaB (/app/b.mjs:3:3)";
    assert.equal(_assinatura(erroCom("Error", "igual", a)), _assinatura(erroCom("Error", "igual", b)));
  });

  test("aguenta o que não é Error sem quebrar", () => {
    // `unhandledRejection` entrega o que foi rejeitado, que pode ser qualquer
    // coisa. Quebrar aqui apagaria o aviso justamente na falha mais grave.
    for (const valor of [null, undefined, "texto solto", 42, {}, { message: 123 }]) {
      const s = _assinatura(valor);
      assert.equal(typeof s, "string");
      assert.ok(s.length > 0, `assinatura vazia para ${JSON.stringify(valor)}`);
    }
  });

  test("erro sem pilha ainda agrupa por nome e mensagem", () => {
    const semPilha = erroCom("Error", "sem pilha", "");
    assert.equal(_assinatura(semPilha), _assinatura(erroCom("Error", "sem pilha", "")));
    assert.notEqual(_assinatura(semPilha), _assinatura(erroCom("Error", "outra", "")));
  });

  test("a assinatura é curta o bastante para caber num log", () => {
    assert.equal(_assinatura(erroCom("Error", "x")).length, 16);
  });
});
