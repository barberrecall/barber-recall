import { createHash } from "node:crypto";
import { logger } from "./logger";
import { enviarEmail, emailConfigurado } from "./email";

/**
 * Aviso por e-mail quando algo quebra em produção.
 *
 * Antes disto, um erro só existia se alguém abrisse o log do Railway na hora
 * certa. Na prática significa descobrir o problema quando o cliente reclama —
 * e um cliente que teve erro e não reclamou simplesmente foi embora.
 *
 * ── Por que não Sentry ──────────────────────────────────────────────────────
 *
 * Sentry é a resposta profissional e faz mais: agrupa por versão, guarda
 * histórico, liga com o mapa de código. O que ele custa aqui é uma dependência
 * grande num workspace que guarda a árvore de propósito, mais uma conta e um
 * DSN a configurar.
 *
 * Para um operador só, com um punhado de barbearias, o valor está em SABER que
 * aconteceu — e isso o e-mail entrega hoje, reusando o Brevo que já está
 * configurado para a recuperação de senha. Quando houver volume suficiente para
 * o inbox virar ruído, a troca por Sentry acontece atrás desta mesma função, e
 * o resto do código não muda.
 *
 * ── O risco óbvio: inundar a caixa de entrada ───────────────────────────────
 *
 * Um erro em laço mandaria milhares de e-mails e viraria um problema pior que o
 * original — a pessoa cria uma regra de filtro e para de ver todos os avisos,
 * inclusive os importantes.
 *
 * Duas travas: mesma assinatura de erro só avisa uma vez por hora, e há um teto
 * global por hora independente da variedade. Passado o teto, os erros continuam
 * no log — o que se perde é o aviso, não o registro.
 */

const JANELA_MS = 60 * 60 * 1000;
const TETO_POR_JANELA = 20;

const ultimoAviso = new Map<string, number>();
let avisosNaJanela = 0;
let janelaComecouEm = Date.now();

/**
 * Assinatura estável do erro.
 *
 * Nome, mensagem e o primeiro quadro da pilha. A mensagem entra porque dois
 * `TypeError` diferentes não são o mesmo problema; a pilha inteira fica de fora
 * porque quadros variam com o caminho da requisição e quebrariam o agrupamento
 * do que é, na prática, a mesma falha.
 */
function assinatura(err: unknown): string {
  const e = err as { name?: unknown; message?: unknown; stack?: unknown };
  const nome = typeof e?.name === "string" ? e.name : "Erro";
  const msg = typeof e?.message === "string" ? e.message : String(err).slice(0, 200);
  const primeiroQuadro =
    typeof e?.stack === "string" ? (e.stack.split("\n")[1] ?? "").trim() : "";

  return createHash("sha256").update(`${nome}|${msg}|${primeiroQuadro}`).digest("hex").slice(0, 16);
}

/** Decide se este erro merece aviso agora, aplicando as duas travas. */
function devoAvisar(chave: string): { sim: boolean; motivo?: string } {
  const agora = Date.now();

  if (agora - janelaComecouEm > JANELA_MS) {
    janelaComecouEm = agora;
    avisosNaJanela = 0;
  }

  const anterior = ultimoAviso.get(chave);
  if (anterior !== undefined && agora - anterior < JANELA_MS) {
    return { sim: false, motivo: "repetido dentro da janela" };
  }

  if (avisosNaJanela >= TETO_POR_JANELA) {
    return { sim: false, motivo: "teto por hora atingido" };
  }

  ultimoAviso.set(chave, agora);
  avisosNaJanela++;
  return { sim: true };
}

function destino(): string | undefined {
  return process.env.ALERTA_EMAIL ?? process.env.EMAIL_REMETENTE;
}

/**
 * Registra o erro e, se couber, avisa por e-mail.
 *
 * Nunca lança: um problema no aviso não pode virar um segundo erro em cima do
 * primeiro, e menos ainda derrubar a requisição que já estava indo mal.
 */
export async function capturarErro(
  err: unknown,
  contexto: Record<string, unknown> = {},
): Promise<void> {
  logger.error({ err, ...contexto }, "Erro capturado");

  const para = destino();
  if (!emailConfigurado() || !para) return;

  const chave = assinatura(err);
  const decisao = devoAvisar(chave);

  if (!decisao.sim) {
    logger.info({ chave, motivo: decisao.motivo }, "Aviso de erro suprimido");
    return;
  }

  const e = err as { name?: unknown; message?: unknown; stack?: unknown };
  const nome = typeof e?.name === "string" ? e.name : "Erro";
  const mensagem = typeof e?.message === "string" ? e.message : String(err);
  const pilha = typeof e?.stack === "string" ? e.stack : "(sem pilha)";

  const detalhes = Object.entries(contexto)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n");

  try {
    await enviarEmail({
      para,
      assunto: `[Barber Recall] ${nome}: ${mensagem.slice(0, 80)}`,
      textoSimples:
        `Um erro aconteceu em produção.\n\n` +
        `${nome}: ${mensagem}\n\n` +
        (detalhes ? `${detalhes}\n\n` : "") +
        `${pilha}\n\n` +
        `Avisos iguais a este ficam suprimidos por 1 hora.`,
      html:
        `<p>Um erro aconteceu em produção.</p>` +
        `<p><strong>${nome}:</strong> ${mensagem}</p>` +
        (detalhes ? `<pre>${detalhes}</pre>` : "") +
        `<pre style="font-size:12px;overflow:auto">${pilha}</pre>` +
        `<p style="color:#666;font-size:12px">Avisos iguais a este ficam suprimidos por 1 hora.</p>`,
    });
  } catch (falhaNoAviso) {
    // O erro original já está no log; este só explica por que o e-mail não veio.
    logger.error({ err: falhaNoAviso }, "Falha ao enviar aviso de erro");
  }
}

/**
 * Liga os avisos às falhas que hoje passam despercebidas.
 *
 * `unhandledRejection` é a mais traiçoeira: uma promessa rejeitada sem `catch`
 * derruba o processo, o Railway reinicia até três vezes e depois o serviço fica
 * fora do ar — sem que ninguém saiba o motivo, porque o log da instância morta
 * fica para trás.
 *
 * Em `uncaughtException` o processo é encerrado de propósito depois do aviso.
 * Continuar rodando depois de uma exceção não capturada significa seguir com
 * estado possivelmente corrompido, e o Railway sabe reiniciar limpo.
 */
export function instalarCapturaGlobal(): void {
  process.on("unhandledRejection", (motivo) => {
    void capturarErro(motivo, { origem: "unhandledRejection" });
  });

  process.on("uncaughtException", (err) => {
    void capturarErro(err, { origem: "uncaughtException" }).finally(() => {
      // Uma folga para o e-mail sair antes do processo morrer. Sem isso o aviso
      // sobre a falha mais grave é justamente o que nunca chega.
      setTimeout(() => process.exit(1), 3000).unref();
    });
  });
}

/** Exposto para teste: zera as travas entre casos. */
export function _limparTravas(): void {
  ultimoAviso.clear();
  avisosNaJanela = 0;
  janelaComecouEm = Date.now();
}

/** Exposto para teste: a assinatura usada no agrupamento. */
export const _assinatura = assinatura;
