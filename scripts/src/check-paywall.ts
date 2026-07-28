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
import { assertDevDatabase } from "@workspace/db/guard";

const BASE = process.env.API_URL ?? "http://localhost:8080";

const email = `paywall-check-${Date.now()}@barberrecall.local`;
const senha = "verificacao123";

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}/api/${path}`, init);
  return { status: res.status, body: await res.json().catch(() => null) };
}

async function main(): Promise<void> {
  let userId: number | null = null;

  // Cria e apaga registros, e mexe em trial_starts_at por SQL direto. Mesmo
  // limpando tudo no fim, isso não deveria acontecer em produção por descuido.
  //
  // Atenção ao usar ALLOW_PROD_DB: este script fala com dois lugares. Se
  // API_URL apontar para um servidor e DATABASE_URL para outro banco, ele cria
  // a conta num e recua o trial no outro — e o teste falha por motivo errado.
  assertDevDatabase("check:paywall");

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

    // Antes de qualquer coisa: com o trial em dia, tudo tem de responder. Um
    // portão que bloqueia demais é tão quebrado quanto um que não bloqueia, e
    // essa metade é a que ninguém percebe até um cliente pagante reclamar.
    const comTrialAtivo = await api("clients", { headers: auth });
    console.log(`  trial em dia:      /clients -> HTTP ${comTrialAtivo.status}`);
    if (comTrialAtivo.status !== 200) {
      throw new Error(`/clients devia responder 200 com trial ativo, respondeu ${comTrialAtivo.status}`);
    }

    /*
     * O mesmo, pelo caminho do navegador.
     *
     * São dois mecanismos de autenticação diferentes — token Bearer no app,
     * cookie de sessão no CRM web — e o cookie depende de uma tabela `session`
     * que o connect-pg-simple mantém fora do schema do drizzle. Essa tabela
     * nunca existiu neste banco, e ninguém percebeu: o app não toca em sessão,
     * o CRM web só foi publicado depois, e todo teste automatizado daqui usava
     * Bearer. O sintoma foi 500 em toda tela do CRM.
     *
     * Testar só o caminho conveniente é como esse tipo de falha sobrevive.
     */
    // Repetido, e não uma vez só: a falha que isto pegou não era determinística.
    // A resposta do login saía antes de a sessão estar legível no Postgres, e a
    // primeira requisição do cliente caía em 401 — entre 25 e 90% das vezes,
    // conforme a carga. Uma única tentativa passaria na maioria das rodadas e
    // deixaria o defeito escondido justamente por ser intermitente.
    const TENTATIVAS = 5;
    const resultados: number[] = [];

    for (let i = 0; i < TENTATIVAS; i++) {
      const loginWeb = await fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const cookie = loginWeb.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");

      if (!cookie) throw new Error("login por cookie não devolveu Set-Cookie");

      const comCookie = await api("barbershop", { headers: { Cookie: cookie } });
      resultados.push(comCookie.status);
    }

    const acertos = resultados.filter((s) => s === 200).length;
    console.log(`  sessão por cookie: ${acertos}/${TENTATIVAS} -> ${resultados.join(" ")}`);

    if (acertos !== TENTATIVAS) {
      throw new Error(
        `sessão por cookie falhou ${TENTATIVAS - acertos} de ${TENTATIVAS} vezes. ` +
          "Se a falha é intermitente, a resposta do login está saindo antes da sessão ser gravada " +
          "(ver saveSession em routes/auth.ts). Se falha sempre, verifique se a tabela `session` existe.",
      );
    }

    // Recua o início do trial muito além de qualquer janela plausível. Só nesta
    // barbearia. Um número grande em vez de TRIAL_DAYS + 1 de propósito: assim o
    // teste não guarda uma cópia da duração do trial que envelhece calada no dia
    // em que TRIAL_DAYS mudar.
    await db.execute(sql`
      update ${barbershopTable}
      set trial_starts_at = now() - interval '10 years'
      where user_id = ${userId}
    `);

    const depois = await api("barbershop", { headers: auth });
    const d = depois.body as { trialExpired: boolean; trialActive: boolean; daysRemaining: number | null };
    console.log(`  trial recuado 10 anos: trialExpired=${d.trialExpired} trialActive=${d.trialActive} daysRemaining=${d.daysRemaining}`);

    if (!d.trialExpired) throw new Error("trial recuado mas trialExpired continua false");

    // O servidor precisa barrar de verdade. Enquanto o bloqueio era só de tela,
    // qualquer cliente HTTP com o token continuava lendo os dados.
    const bloqueadas = ["clients", "appointments", "campaigns", "dashboard/stats", "reports"];
    const abertas = ["barbershop"];

    for (const rota of bloqueadas) {
      const r = await api(rota, { headers: auth });
      const ok = r.status === 402;
      console.log(`  ${ok ? "bloqueada" : "ABERTA   "}  /${rota} -> HTTP ${r.status}`);
      if (!ok) throw new Error(`/${rota} devia responder 402 com assinatura expirada, respondeu ${r.status}`);
    }

    for (const rota of abertas) {
      const r = await api(rota, { headers: auth });
      const ok = r.status === 200;
      console.log(`  ${ok ? "aberta   " : "BLOQUEADA"}  /${rota} -> HTTP ${r.status}`);
      // Sem esta, o cliente não consegue ler o próprio estado para explicar ao
      // barbeiro o que aconteceu — vira erro genérico em vez de tela de aviso.
      if (!ok) throw new Error(`/${rota} precisa continuar aberta para o cliente saber que expirou, respondeu ${r.status}`);
    }

    // O painel de super admin fica fora do portão de propósito: ele administra
    // todas as barbearias, e o estado da assinatura da barbearia própria do
    // admin não pode derrubar isso. Aqui a conta não é admin, então o esperado é
    // 401 (barrado por adminOnly) — o que importa é NÃO ser 402, porque 402
    // significaria que o portão veio antes e engoliria o painel.
    const adminR = await api("admin/stats", { headers: auth });
    console.log(`  fora do portão  /admin/stats -> HTTP ${adminR.status} (401 esperado: não é admin)`);
    if (adminR.status === 402) {
      throw new Error("/admin/stats caiu atrás do portão de assinatura — o super admin perderia o painel");
    }

    console.log("\nOK: trial expira, o servidor barra as rotas de dados e mantém /barbershop legível.");
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
