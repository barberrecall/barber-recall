import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { barbershopTable } from "@workspace/db";
import { computeTrialStatus, TRIAL_DAYS } from "./trial";

/**
 * Esta função decide quem entra e quem é bloqueado, no app e no CRM. Errar para
 * um lado libera acesso não pago; errar para o outro tranca quem pagou — e o
 * segundo caso é o que gera cancelamento.
 *
 * Os testes usam datas relativas a agora em vez de datas fixas: a regra é sobre
 * distância no tempo, e uma data fixa começaria a falhar sozinha em algum
 * momento futuro por motivo que não é o defeito.
 */

type Barbearia = typeof barbershopTable.$inferSelect;

const DIA = 24 * 60 * 60 * 1000;

/** Barbearia mínima: só o que `computeTrialStatus` lê. */
function barbearia(campos: {
  plan: string;
  trialStartsAt: Date;
  planExpiresAt?: Date | null;
}): Barbearia {
  return {
    plan: campos.plan,
    trialStartsAt: campos.trialStartsAt,
    planExpiresAt: campos.planExpiresAt ?? null,
  } as Barbearia;
}

const agoraMenos = (dias: number): Date => new Date(Date.now() - dias * DIA);
const agoraMais = (dias: number): Date => new Date(Date.now() + dias * DIA);

describe("plano gratuito, dentro do teste", () => {
  test("conta recém-criada tem o teste ativo", () => {
    const s = computeTrialStatus(barbearia({ plan: "free", trialStartsAt: new Date() }));
    assert.equal(s.trialActive, true);
    assert.equal(s.trialExpired, false);
    assert.equal(s.daysRemaining, TRIAL_DAYS);
  });

  test("dias restantes diminuem com o tempo", () => {
    const s = computeTrialStatus(barbearia({ plan: "free", trialStartsAt: agoraMenos(1) }));
    assert.equal(s.trialExpired, false);
    assert.equal(s.daysRemaining, TRIAL_DAYS - 1);
  });

  test("no último instante antes de vencer, ainda vale", () => {
    // Um minuto antes da virada. É a fronteira que decide entre o barbeiro
    // trabalhar ou ver tela de bloqueio.
    const quase = new Date(Date.now() - (TRIAL_DAYS * DIA - 60_000));
    const s = computeTrialStatus(barbearia({ plan: "free", trialStartsAt: quase }));
    assert.equal(s.trialExpired, false);
    assert.equal(s.trialActive, true);
  });
});

describe("plano gratuito, teste vencido", () => {
  test("no instante da virada já está vencido", () => {
    const s = computeTrialStatus(
      barbearia({ plan: "free", trialStartsAt: new Date(Date.now() - (TRIAL_DAYS * DIA + 1000)) }),
    );
    assert.equal(s.trialExpired, true);
    assert.equal(s.trialActive, false);
  });

  test("dias restantes nunca fica negativo", () => {
    // O número vai para a tela. Negativo apareceria como "-27 dias restantes".
    const s = computeTrialStatus(barbearia({ plan: "free", trialStartsAt: agoraMenos(30) }));
    assert.equal(s.daysRemaining, 0);
  });

  test("plano continua free mesmo vencido", () => {
    const s = computeTrialStatus(barbearia({ plan: "free", trialStartsAt: agoraMenos(30) }));
    assert.equal(s.plan, "free");
    assert.equal(s.planExpiresAt, null);
  });
});

describe("plano pago", () => {
  test("assinatura em dia não bloqueia", () => {
    const s = computeTrialStatus(
      barbearia({ plan: "pro", trialStartsAt: agoraMenos(365), planExpiresAt: agoraMais(30) }),
    );
    assert.equal(s.trialExpired, false);
    assert.equal(s.plan, "pro");
    assert.equal(s.daysRemaining, 30);
  });

  test("teste vencido há muito tempo não afeta quem paga", () => {
    // A regressão que mais dói: cobrar de alguém e bloquear mesmo assim porque
    // o trial dele venceu um ano atrás.
    const s = computeTrialStatus(
      barbearia({ plan: "pro", trialStartsAt: agoraMenos(400), planExpiresAt: agoraMais(1) }),
    );
    assert.equal(s.trialExpired, false);
  });

  test("assinatura vencida bloqueia e volta a ser free", () => {
    const s = computeTrialStatus(
      barbearia({ plan: "pro", trialStartsAt: agoraMenos(365), planExpiresAt: agoraMenos(1) }),
    );
    assert.equal(s.trialExpired, true);
    assert.equal(s.plan, "free");
  });

  test("pro sem data de expiração é assinante antigo, sem bloqueio", () => {
    const s = computeTrialStatus(
      barbearia({ plan: "pro", trialStartsAt: agoraMenos(365), planExpiresAt: null }),
    );
    assert.equal(s.trialExpired, false);
    assert.equal(s.daysRemaining, null);
    assert.equal(s.planExpiresAt, null);
  });

  test("trialActive é falso para quem paga", () => {
    // Quem paga não está em teste. O app usa isto para decidir se mostra o
    // aviso de "N dias de teste restantes", que seria mentira aqui.
    const s = computeTrialStatus(
      barbearia({ plan: "pro", trialStartsAt: agoraMenos(1), planExpiresAt: agoraMais(30) }),
    );
    assert.equal(s.trialActive, false);
  });
});
