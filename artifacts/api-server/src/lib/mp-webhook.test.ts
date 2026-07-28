import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { tsParaMs } from "./mp-webhook";

/**
 * Este teste existe porque a versão anterior desta lógica recusava TODAS as
 * notificações reais do Mercado Pago: o `ts` vem em segundos e era comparado
 * como milissegundos. O sintoma para quem vende é o pior possível — o cliente
 * paga, o dinheiro entra, o acesso não libera.
 *
 * O caso "em segundos" não é redundância: era exatamente ele que faltava, e
 * todos os testes anteriores usavam milissegundos por ser a unidade que o
 * JavaScript entrega de graça.
 */

describe("tsParaMs", () => {
  test("epoch em segundos vira milissegundos", () => {
    // 10 dígitos — é o que o Mercado Pago manda de verdade.
    assert.equal(tsParaMs("1785198716"), 1785198716000);
  });

  test("epoch em milissegundos passa intacto", () => {
    assert.equal(tsParaMs("1785198716072"), 1785198716072);
  });

  test("a deriva calculada fica dentro da janela nas duas unidades", () => {
    // A verificação que importa: qualquer que seja a unidade, um timestamp de
    // agora precisa resultar em deriva perto de zero. Sem a normalização, a
    // versão em segundos dava mais de cinquenta anos.
    const agora = Date.now();
    const emSegundos = String(Math.floor(agora / 1000));
    const emMs = String(agora);

    const derivaSegundos = Math.abs(agora - tsParaMs(emSegundos)) / 1000;
    const derivaMs = Math.abs(agora - tsParaMs(emMs)) / 1000;

    assert.ok(derivaSegundos < 2, `deriva em segundos foi ${derivaSegundos}s`);
    assert.ok(derivaMs < 2, `deriva em ms foi ${derivaMs}s`);
  });

  test("um timestamp antigo continua sendo antigo depois da conversão", () => {
    // A normalização não pode transformar replay tardio em notificação fresca.
    const dezMinutosAtras = Math.floor((Date.now() - 10 * 60 * 1000) / 1000);
    const deriva = Math.abs(Date.now() - tsParaMs(String(dezMinutosAtras))) / 1000;
    assert.ok(deriva > 300, `deriva foi ${deriva}s, deveria passar da tolerância de 300s`);
  });
});
