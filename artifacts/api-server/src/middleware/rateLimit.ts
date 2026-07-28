import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * Freio para tentativas de login.
 *
 * Sem isto, `/auth/login` aceita milhares de senhas por minuto de um mesmo
 * lugar, sem custo e sem deixar rastro. A senha da conta de produção deste
 * projeto tem oito caracteres — força bruta não é hipótese distante.
 *
 * ── Por que escrito à mão ───────────────────────────────────────────────────
 *
 * Mesma razão do `authToken.ts` não usar biblioteca de JWT: este workspace
 * guarda a cadeia de dependências de propósito (ver `minimumReleaseAge` em
 * pnpm-workspace.yaml), e contagem em janela deslizante cabe em vinte linhas.
 * O modo de falhar aqui é ameno — no pior caso alguém espera um minuto a mais.
 *
 * ── Limitações que importam ─────────────────────────────────────────────────
 *
 * A contagem é em memória. Reiniciar o servidor zera, e com mais de uma
 * instância cada uma conta a sua parte. Hoje é uma instância só; se escalar,
 * isto precisa ir para o Postgres ou para um Redis — e o comentário some junto
 * com a limitação.
 *
 * Conta por IP + e-mail tentado, não só por IP: contar só por IP puniria uma
 * barbearia inteira atrás do mesmo roteador quando um funcionário erra a senha,
 * e contar só por e-mail deixaria um atacante varrer contas diferentes à
 * vontade.
 */

type Tentativas = { marcas: number[] };

const JANELA_MS = 15 * 60 * 1000;
const MAX_TENTATIVAS = 10;
const LIMPEZA_MS = 5 * 60 * 1000;

const registro = new Map<string, Tentativas>();

/**
 * Descarta chaves cujas tentativas já saíram da janela.
 *
 * Sem isto o Map cresce para sempre — cada e-mail tentado uma única vez ficaria
 * na memória até o processo morrer, o que transforma o próprio freio num vetor
 * de esgotamento de memória.
 */
const limpeza = setInterval(() => {
  const corte = Date.now() - JANELA_MS;
  for (const [chave, t] of registro) {
    if (t.marcas.every((m) => m <= corte)) registro.delete(chave);
  }
}, LIMPEZA_MS);

// Não segura o processo vivo só por causa do timer.
limpeza.unref();

function chaveDe(req: Request): string {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  const identificador = typeof email === "string" ? email.toLowerCase().trim() : "";
  return `${req.ip ?? "sem-ip"}|${identificador}`;
}

/**
 * Middleware de limite. Aplicar só em rotas de autenticação — o resto da API já
 * exige sessão válida, e limitar leitura de clientes atrapalharia uso legítimo.
 */
export function limiteDeTentativas(req: Request, res: Response, next: NextFunction): void {
  const chave = chaveDe(req);
  const agora = Date.now();
  const corte = agora - JANELA_MS;

  const atual = registro.get(chave) ?? { marcas: [] };
  atual.marcas = atual.marcas.filter((m) => m > corte);

  if (atual.marcas.length >= MAX_TENTATIVAS) {
    const maisAntiga = Math.min(...atual.marcas);
    const esperaSegundos = Math.ceil((maisAntiga + JANELA_MS - agora) / 1000);

    registro.set(chave, atual);

    logger.warn({ ip: req.ip, rota: req.path }, "Limite de tentativas atingido");

    res.setHeader("Retry-After", String(esperaSegundos));
    res.status(429).json({
      error: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    });
    return;
  }

  atual.marcas.push(agora);
  registro.set(chave, atual);

  /*
   * Um login que deu certo zera a contagem.
   *
   * Sem isso, quem erra a senha nove vezes e acerta na décima continua a um
   * passo do bloqueio pelos próximos quinze minutos — e seria bloqueado no
   * próximo erro de digitação, já autenticado. O gancho no fim da resposta é o
   * único ponto que sabe se deu certo.
   */
  res.on("finish", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) registro.delete(chave);
  });

  next();
}

/** Exposto para teste: devolve o estado a zero entre casos. */
export function _limparRegistro(): void {
  registro.clear();
}
