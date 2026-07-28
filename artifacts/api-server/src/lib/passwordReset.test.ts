import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  gerarToken,
  hashDoToken,
  tokensConferem,
  estaVencido,
  senhaAceitavel,
  VALIDADE_MS,
  MIN_SENHA,
} from "./passwordReset";

/**
 * Recuperação de senha é o caminho oficial para assumir uma conta sem saber a
 * senha. Cada propriedade aqui é uma tranca; a falha de qualquer uma delas não
 * aparece em uso normal e só se manifesta como invasão.
 */

describe("gerarToken", () => {
  test("dois tokens nunca são iguais", () => {
    const vistos = new Set<string>();
    for (let i = 0; i < 500; i++) vistos.add(gerarToken());
    assert.equal(vistos.size, 500);
  });

  test("é longo o bastante para não ser adivinhado", () => {
    // 32 bytes em base64url dão 43 caracteres. Um código de seis dígitos seria
    // um milhão de possibilidades — força bruta viável se o freio falhar.
    const t = gerarToken();
    assert.ok(t.length >= 43, `token tem ${t.length} caracteres`);
  });

  test("não contém caracteres que quebram em URL", () => {
    // O token viaja numa query string. `+`, `/` e `=` do base64 comum seriam
    // reescritos pelo navegador e o link chegaria diferente do que foi gerado.
    for (let i = 0; i < 100; i++) {
      assert.match(gerarToken(), /^[A-Za-z0-9_-]+$/);
    }
  });
});

describe("hashDoToken", () => {
  test("o mesmo token gera sempre o mesmo hash", () => {
    const t = gerarToken();
    assert.equal(hashDoToken(t), hashDoToken(t));
  });

  test("tokens diferentes geram hashes diferentes", () => {
    assert.notEqual(hashDoToken(gerarToken()), hashDoToken(gerarToken()));
  });

  test("o hash não contém o token", () => {
    // O que vai para o banco precisa ser inútil para quem o ler: um backup
    // vazado não pode virar acesso às contas.
    const t = gerarToken();
    const h = hashDoToken(t);
    assert.ok(!h.includes(t));
    assert.equal(h.length, 64); // sha-256 em hexadecimal
  });
});

describe("tokensConferem", () => {
  test("iguais conferem", () => {
    const h = hashDoToken(gerarToken());
    assert.equal(tokensConferem(h, h), true);
  });

  test("diferentes não conferem", () => {
    assert.equal(tokensConferem(hashDoToken("a"), hashDoToken("b")), false);
  });

  test("tamanhos diferentes não derrubam a comparação", () => {
    // `timingSafeEqual` lança quando os tamanhos diferem; sem o portão de
    // comprimento isto viraria 500 em vez de recusa.
    assert.equal(tokensConferem("curto", hashDoToken("qualquer")), false);
    assert.equal(tokensConferem("", "x"), false);
  });
});

describe("estaVencido", () => {
  test("no futuro, não venceu", () => {
    assert.equal(estaVencido(new Date(Date.now() + VALIDADE_MS)), false);
  });

  test("no passado, venceu", () => {
    assert.equal(estaVencido(new Date(Date.now() - 1000)), true);
  });

  test("no instante exato, já venceu", () => {
    // A fronteira decide entre um link vencido funcionar ou não. Empate conta
    // como vencido — é o lado seguro.
    const agora = new Date();
    assert.equal(estaVencido(agora, agora), true);
  });
});

describe("senhaAceitavel", () => {
  test("recusa senha curta", () => {
    const r = senhaAceitavel("1234567");
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.motivo, new RegExp(String(MIN_SENHA)));
  });

  test("aceita no limite", () => {
    assert.equal(senhaAceitavel("12345678").ok, true);
  });

  test("recusa vazio, nulo e não-texto", () => {
    for (const v of ["", null, undefined, 12345678, {}]) {
      assert.equal(senhaAceitavel(v).ok, false, `deveria recusar: ${JSON.stringify(v)}`);
    }
  });

  test("não exige maiúscula, número ou símbolo", () => {
    // Regra de composição produz senhas piores na prática — as pessoas
    // respondem com "Senha@123" — e afasta quem está tentando recuperar o
    // acesso ao próprio negócio.
    assert.equal(senhaAceitavel("cortedecabelo").ok, true);
  });
});
