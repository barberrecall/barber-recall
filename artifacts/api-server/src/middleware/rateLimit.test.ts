import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { Request, Response, NextFunction } from "express";
import { limiteDeTentativas, _limparRegistro } from "./rateLimit";

/**
 * Freio escrito à mão merece teste à mão.
 *
 * Os dois modos de errar têm consequências opostas: frouxo demais deixa a força
 * bruta passar; apertado demais tranca o barbeiro fora do próprio sistema num
 * dia de trabalho. Os casos abaixo cobrem os dois lados, e a separação por
 * chave — que é onde um engano puniria gente inocente.
 */

type Chamada = { status?: number; corpo?: unknown; headers: Record<string, string> };

/** Resposta falsa: registra o que foi respondido e dispara `finish` sob demanda. */
function respostaFalsa(statusFinal = 401): { res: Response; chamada: Chamada; finalizar: () => void } {
  const chamada: Chamada = { headers: {} };
  const ouvintes: Array<() => void> = [];

  // Objeto montado antes de tipar como Response para os métodos poderem
  // referenciar `falsa` por nome — dentro de um literal com `as unknown as`,
  // `this` é inferido como `{}` e o TypeScript recusa a atribuição.
  const falsa = {
    statusCode: statusFinal,
    setHeader(nome: string, valor: string) {
      chamada.headers[nome] = valor;
    },
    status(code: number) {
      chamada.status = code;
      falsa.statusCode = code;
      return falsa;
    },
    json(corpo: unknown) {
      chamada.corpo = corpo;
      return falsa;
    },
    on(evento: string, cb: () => void) {
      if (evento === "finish") ouvintes.push(cb);
      return falsa;
    },
  };

  const res = falsa as unknown as Response;

  return { res, chamada, finalizar: () => ouvintes.forEach((cb) => cb()) };
}

function requisicao(ip: string, email?: string): Request {
  return { ip, path: "/auth/login", body: email ? { email } : {} } as unknown as Request;
}

/** Uma tentativa completa; devolve se passou e o que foi respondido. */
function tentar(ip: string, email: string, statusFinal = 401) {
  const { res, chamada, finalizar } = respostaFalsa(statusFinal);
  let passou = false;
  const next: NextFunction = () => {
    passou = true;
  };
  limiteDeTentativas(requisicao(ip, email), res, next);
  if (passou) finalizar();
  return { passou, chamada };
}

beforeEach(() => {
  _limparRegistro();
});

describe("limite de tentativas", () => {
  test("deixa passar as primeiras tentativas", () => {
    for (let i = 1; i <= 10; i++) {
      assert.equal(tentar("1.1.1.1", "a@b.com").passou, true, `tentativa ${i} deveria passar`);
    }
  });

  test("bloqueia a partir da décima primeira", () => {
    for (let i = 0; i < 10; i++) tentar("1.1.1.1", "a@b.com");

    const { passou, chamada } = tentar("1.1.1.1", "a@b.com");
    assert.equal(passou, false);
    assert.equal(chamada.status, 429);
    // Sem o Retry-After o cliente não sabe se espera um minuto ou uma hora.
    assert.ok(chamada.headers["Retry-After"], "deveria dizer quanto esperar");
  });

  test("bloqueio de um e-mail não afeta outro no mesmo IP", () => {
    // A barbearia inteira atrás do mesmo roteador: um funcionário errar a senha
    // não pode trancar os colegas.
    for (let i = 0; i < 11; i++) tentar("1.1.1.1", "azarado@b.com");

    assert.equal(tentar("1.1.1.1", "outro@b.com").passou, true);
  });

  test("bloqueio de um IP não afeta a mesma conta de outro lugar", () => {
    // O contrário também: um atacante martelando um e-mail não pode deixar o
    // dono da conta sem conseguir entrar de casa.
    for (let i = 0; i < 11; i++) tentar("9.9.9.9", "vitima@b.com");

    assert.equal(tentar("1.1.1.1", "vitima@b.com").passou, true);
  });

  test("login bem-sucedido zera a contagem", () => {
    // Quem erra nove vezes e acerta na décima não pode ficar a um passo do
    // bloqueio pelos próximos quinze minutos, já autenticado.
    for (let i = 0; i < 9; i++) tentar("1.1.1.1", "a@b.com", 401);

    tentar("1.1.1.1", "a@b.com", 200); // acertou

    for (let i = 0; i < 10; i++) {
      assert.equal(tentar("1.1.1.1", "a@b.com").passou, true, `pós-sucesso ${i} deveria passar`);
    }
  });

  test("requisição sem e-mail no corpo não derruba o middleware", () => {
    const { res } = respostaFalsa();
    let passou = false;
    limiteDeTentativas(requisicao("1.1.1.1"), res, () => {
      passou = true;
    });
    assert.equal(passou, true);
  });
});
