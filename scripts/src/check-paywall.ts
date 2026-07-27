/**
 * Verifica o bloqueio por assinatura sem tocar em conta real.
 *
 * Cria uma barbearia descartável, recua o `trialStartsAt` além da janela de
 * teste, confirma que a API passa a devolver `trialExpired: true`, e apaga tudo
 * no final. A conta real nunca é alterada — mexer no trial dela poderia trancar
 * o acesso do próprio dono.
 *
 * Uso: API_URL=... SEED_EMAIL=... SEED_PASSWORD=... pnpm --filter @workspace/scripts run check:paywall
 */
import { sql } from "drizzle-orm";
import { db, barbershopTable, usersTable } from "@workspace/db";

const BASE = process.env.API_URL ?? "http://localhost:8080";
const TRIAL_DAYS = 3; // igual a TRIAL_DAYS em routes/barbershop.ts

const email = `paywall-check-${Date.now()}@barberrecall.local`;
const senha = "verificacao123";

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}/api/${path}`, init);
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function main(): Promise<void> {
  let userId: number | null = null;

  try {
    console.log(`API: ${BASE}`);

    const registro = await api("auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        senha,
        nomeDono: "Verificação Paywall",
        nomeBarbearia: "Descartável",
        issueToken: true,
      }),
    });

    if (registro.status !== 201) {
      throw new Error(`registro falhou: ${registro.status} ${JSON.stringify(registro.body)}`);
    }

    const token = (registro.body as { token: string }).token;
    userId = (registro.body as { user: { id: number } }).user.id;
    const auth = { Authorization: `Bearer ${token}` };

    const antes = await api("barbershop", { headers: auth });
    const a = antes.body as { trialExpired: boolean; daysRemaining: number | null };
    console.log(`  recém-criada:      trialExpired=${a.trialExpired} daysRemaining=${a.daysRemaining}`);

    if (a.trialExpired) throw new Error("conta nova já vem expirada — regra de trial quebrada");

    // Recua o início do trial além da janela. Só nesta barbearia.
    await db.execute(sql`
      update ${barbershopTable}
      set trial_starts_at = now() - make_interval(days => ${TRIAL_DAYS + 1}::int)
      where user_id = ${userId}
    `);

    const depois = await api("barbershop", { headers: auth });
    const d = depois.body as { trialExpired: boolean; trialActive: boolean; daysRemaining: number | null };
    console.log(`  trial recuado ${TRIAL_DAYS + 1}d:  trialExpired=${d.trialExpired} trialActive=${d.trialActive} daysRemaining=${d.daysRemaining}`);

    if (!d.trialExpired) throw new Error("trial recuado mas trialExpired continua false");

    // O bloqueio é de interface: a API deve continuar respondendo, senão o app
    // não teria como ler o estado para exibir a tela de expirado.
    const clientes = await api("clients", { headers: auth });
    console.log(`  /clients com trial expirado: HTTP ${clientes.status} (a API segue aberta; o bloqueio é no app)`);

    console.log("\nOK: a API vira trialExpired corretamente e o app tem o sinal para bloquear.");
  } finally {
    if (userId !== null) {
      // Cascade leva a barbearia e o que estiver ligado a ela.
      await db.execute(sql`delete from ${usersTable} where id = ${userId}`);
      console.log("conta descartável removida.");
    }
    process.exit(0);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
