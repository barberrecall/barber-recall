import { test, describe, before, after } from "node:test";
import { createHmac } from "node:crypto";
import assert from "node:assert/strict";
import { createAuthToken, verifyAuthToken } from "./authToken";

/**
 * O token do app é a credencial inteira: quem o forjar entra como qualquer
 * barbearia e lê os clientes dela. Não há sessão no servidor para conferir
 * depois — o que a assinatura disser, vale.
 *
 * Por isso os testes que importam aqui são os de recusa, não os de sucesso. O
 * caminho feliz falharia de forma barulhenta no primeiro login; a assinatura
 * aceita indevidamente não falha nunca, só vaza.
 */

const SEGREDO_ORIGINAL = process.env.SESSION_SECRET;

before(() => {
  process.env.SESSION_SECRET = "segredo-de-teste-para-os-tokens";
});

after(() => {
  if (SEGREDO_ORIGINAL === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = SEGREDO_ORIGINAL;
});

describe("createAuthToken / verifyAuthToken", () => {
  test("token recém-criado devolve quem é", () => {
    const payload = verifyAuthToken(createAuthToken(7, 42));
    assert.equal(payload?.uid, 7);
    assert.equal(payload?.bid, 42);
  });

  test("token expirado é recusado", () => {
    // TTL negativo: já nasce vencido.
    const token = createAuthToken(7, 42, -1000);
    assert.equal(verifyAuthToken(token), null);
  });

  test("payload alterado invalida a assinatura", () => {
    // O ataque óbvio: trocar o barbershopId para ler dados de outra barbearia.
    const token = createAuthToken(7, 42);
    const [encoded, assinatura] = token.split(".");
    const adulterado = Buffer.from(
      JSON.stringify({ uid: 7, bid: 999, exp: Date.now() + 60_000 }),
      "utf8",
    ).toString("base64url");

    assert.equal(verifyAuthToken(`${adulterado}.${assinatura}`), null);
    // E o original continua válido, para provar que o teste não passou por acaso.
    assert.equal(verifyAuthToken(`${encoded}.${assinatura}`)?.bid, 42);
  });

  test("assinatura de outro segredo é recusada", () => {
    const token = createAuthToken(7, 42);
    process.env.SESSION_SECRET = "outro-segredo-completamente-diferente";
    try {
      assert.equal(verifyAuthToken(token), null);
    } finally {
      process.env.SESSION_SECRET = "segredo-de-teste-para-os-tokens";
    }
  });

  test("tokens malformados não derrubam o servidor", () => {
    // `timingSafeEqual` lança quando os tamanhos diferem; sem o portão de
    // comprimento, um token curto viraria 500 em vez de 401.
    for (const lixo of ["", ".", "abc", "abc.", ".abc", "a.b.c", "x".repeat(500)]) {
      assert.equal(verifyAuthToken(lixo), null, `deveria recusar: ${JSON.stringify(lixo)}`);
    }
  });

  test("payload sem os campos esperados é recusado", () => {
    // Assinatura VÁLIDA, conteúdo inútil: só a verificação de formato pega.
    const encoded = Buffer.from(JSON.stringify({ oi: "tudo bem" }), "utf8").toString("base64url");
    const assinatura = createHmac("sha256", "segredo-de-teste-para-os-tokens")
      .update(encoded)
      .digest("base64url");

    assert.equal(verifyAuthToken(`${encoded}.${assinatura}`), null);
  });

  test("uid ou bid não inteiros são recusados", () => {
    const assinar = (dados: object): string => {
      const encoded = Buffer.from(JSON.stringify(dados), "utf8").toString("base64url");
      const assinatura = createHmac("sha256", "segredo-de-teste-para-os-tokens")
        .update(encoded)
        .digest("base64url");
      return `${encoded}.${assinatura}`;
    };

    const futuro = Date.now() + 60_000;
    assert.equal(verifyAuthToken(assinar({ uid: 1.5, bid: 42, exp: futuro })), null);
    assert.equal(verifyAuthToken(assinar({ uid: "7", bid: 42, exp: futuro })), null);
    assert.equal(verifyAuthToken(assinar({ uid: 7, bid: null, exp: futuro })), null);
  });

  test("tokens de barbearias diferentes não colidem", () => {
    const a = createAuthToken(1, 1);
    const b = createAuthToken(1, 2);
    assert.notEqual(a, b);
    assert.equal(verifyAuthToken(a)?.bid, 1);
    assert.equal(verifyAuthToken(b)?.bid, 2);
  });
});
