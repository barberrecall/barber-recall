/**
 * Popula uma barbearia com dados de demonstração.
 *
 * Escreve pela API pública em vez de dar INSERT direto no banco, de propósito:
 * assim o caminho real é exercitado (isolamento por tenant, validação de FKs,
 * `syncClientRecallCache`) e os dados saem coerentes com as regras de negócio
 * em vez de só plausíveis.
 *
 * Uso:
 *   API_URL=http://localhost:8080 \
 *   SEED_EMAIL=voce@exemplo.com SEED_PASSWORD=suasenha \
 *   pnpm --filter @workspace/scripts run seed:demo
 *
 * Alternativamente passe API_TOKEN e o login é dispensado.
 *
 * As datas são relativas a hoje para que os três status de recall apareçam.
 * Com `diasRetorno = 30` e a margem de 7 dias da skill `client-recall-logic`:
 * ativo até 30 dias, aguardando retorno de 31 a 37, em risco acima de 37.
 */

const BASE = process.env.API_URL ?? "http://localhost:8080";

interface Created {
  id: number;
}

const diasAtras = (dias: number): string =>
  new Date(Date.now() - dias * 86_400_000).toISOString();

async function login(): Promise<string> {
  const fromEnv = process.env.API_TOKEN;
  if (fromEnv) return fromEnv;

  const email = process.env.SEED_EMAIL;
  const senha = process.env.SEED_PASSWORD;

  if (!email || !senha) {
    throw new Error(
      "Defina API_TOKEN, ou SEED_EMAIL e SEED_PASSWORD para o script autenticar.",
    );
  }

  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // `issueToken` faz o servidor emitir um Bearer em vez de depender do cookie
    // de sessão, que é o que um cliente não-navegador precisa.
    body: JSON.stringify({ email, senha, issueToken: true }),
  });

  if (!res.ok) {
    throw new Error(`Login falhou: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error("Servidor não devolveu token.");

  return body.token;
}

const BARBEIROS = [
  { nome: "Carlos Mendes", telefone: "11988880001" },
  { nome: "Rafael Dias", telefone: "11988880002" },
  { nome: "Bruno Teixeira", telefone: "11988880003" },
];

const SERVICOS = [
  { nome: "Corte", valor: 45, duracao: 30 },
  { nome: "Barba", valor: 35, duracao: 20 },
  { nome: "Corte + Barba", valor: 70, duracao: 50 },
  { nome: "Degradê", valor: 55, duracao: 40 },
];

/**
 * `visitas` são dias atrás; a mais recente decide o status de recall.
 *
 * Gabriel Rocha não tem atendimento nenhum: o status dele cai no `createdAt`,
 * então aparece como `active` por ter sido cadastrado agora — cliente novo não
 * é cliente em risco.
 */
/**
 * O `dias` da campanha não antecipa o disparo: o piso é sempre o
 * `diasRetorno` da barbearia (skill `campanhas-whatsapp`), então o gatilho
 * efetivo é `max(diasRetorno, campaign.dias)`.
 */
const CAMPANHAS = [
  {
    nome: "Volta pro corte",
    tipo: "return" as const,
    dias: 30,
    mensagem:
      "Oi {nome}! Faz {dias} dias que você não aparece na {barbearia}. Bora marcar um horário?",
  },
  {
    nome: "Parabéns do mês",
    tipo: "birthday" as const,
    dias: 3,
    mensagem: "{nome}, a {barbearia} deseja um feliz aniversário! {cupom_texto}",
  },
];

const CLIENTES = [
  { nome: "João Silva", telefone: "11991110001", visitas: [60, 30, 5], servico: 2 },
  { nome: "Pedro Santos", telefone: "11991110002", visitas: [0], servico: 0 },
  { nome: "Lucas Oliveira", telefone: "11991110003", visitas: [28, 0], servico: 3 },
  { nome: "Marcos Souza", telefone: "11991110004", visitas: [40, 12], servico: 1 },
  { nome: "André Lima", telefone: "11991110005", visitas: [66, 34], servico: 0 },
  { nome: "Felipe Costa", telefone: "11991110006", visitas: [33], servico: 2 },
  { nome: "Rodrigo Alves", telefone: "11991110007", visitas: [90, 55], servico: 3 },
  { nome: "Thiago Martins", telefone: "11991110008", visitas: [75], servico: 1 },
  { nome: "Gabriel Rocha", telefone: "11991110009", visitas: [], servico: 0 },
];

async function main(): Promise<void> {
  const token = await login();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  async function post<T extends Created>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${BASE}/api${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`POST ${path} -> ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as T;
  }

  // Rodar duas vezes duplicaria tudo, e clientes repetidos distorcem os KPIs de
  // recall sem deixar óbvio o motivo.
  const existing = (await (
    await fetch(`${BASE}/api/clients`, { headers })
  ).json()) as unknown[];

  if (existing.length > 0) {
    console.error(
      `A barbearia já tem ${existing.length} cliente(s). Apague-os antes de semear, ` +
        `ou os dados de demonstração vão duplicar.`,
    );
    process.exitCode = 1;
    return;
  }

  const barbeiros: Created[] = [];
  for (const barbeiro of BARBEIROS) barbeiros.push(await post("/barbers", barbeiro));

  const servicos: (Created & { valor: number })[] = [];
  for (const servico of SERVICOS) {
    servicos.push(await post<Created & { valor: number }>("/services", servico));
  }

  let atendimentos = 0;

  for (const [i, cliente] of CLIENTES.entries()) {
    const criado = await post("/clients", {
      nome: cliente.nome,
      telefone: cliente.telefone,
    });
    const servico = servicos[cliente.servico];

    for (const [j, dias] of cliente.visitas.entries()) {
      // Espalha entre os barbeiros para o filtro da tela ter o que filtrar.
      const barbeiro = barbeiros[(i + j) % barbeiros.length];

      await post("/appointments", {
        clienteId: criado.id,
        barbeiroId: barbeiro.id,
        servicoId: servico.id,
        valor: servico.valor,
        desconto: 0,
        valorFinal: servico.valor,
        data: diasAtras(dias),
      });

      atendimentos++;
    }
  }

  for (const campanha of CAMPANHAS) await post("/campaigns", campanha);

  // Monta os "Disparos de hoje" a partir das campanhas recém-criadas, para a
  // tela de Campanhas já abrir com conteúdo em vez de uma lista vazia.
  const gerados = (await (
    await fetch(`${BASE}/api/notifications/generate`, { method: "POST", headers })
  ).json()) as { generated: number };

  console.log(
    `Criados: ${barbeiros.length} barbeiros, ${servicos.length} serviços, ` +
      `${CLIENTES.length} clientes, ${atendimentos} atendimentos, ` +
      `${CAMPANHAS.length} campanhas, ${gerados.generated} disparos pendentes.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
