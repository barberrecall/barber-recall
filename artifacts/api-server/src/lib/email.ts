import { logger } from "./logger";

/**
 * Envio de e-mail transacional.
 *
 * Hoje só a recuperação de senha usa isto, e é o único caso em que o sistema
 * precisa alcançar alguém por conta própria — o resto das mensagens ao cliente
 * final vai por WhatsApp, aberto pelo barbeiro (ver a skill campanhas-whatsapp).
 *
 * ── Por que Brevo, e por que sem biblioteca ─────────────────────────────────
 *
 * Brevo aceita **remetente único verificado**: dá para enviar de um Gmail
 * confirmado, sem possuir domínio. Isso importa porque este projeto ainda não
 * tem domínio — o Resend, alternativa comum, só entrega para o próprio e-mail
 * do dono enquanto não houver domínio verificado, o que inviabiliza recuperar a
 * senha de um cliente.
 *
 * A API é REST e `fetch` resolve, então nada entra na árvore de dependências —
 * mesma escolha do authToken.ts e do rateLimit.ts, e coerente com o
 * `minimumReleaseAge` que este workspace mantém.
 *
 * ── Quando não está configurado ─────────────────────────────────────────────
 *
 * Sem BREVO_API_KEY o envio não falha: registra o conteúdo no log e devolve
 * sucesso. É o que permite desenvolver e testar o fluxo inteiro sem credencial
 * — e o que faria a recuperação parecer funcionar em produção sem entregar
 * nada, por isso o aviso na subida do servidor (ver index.ts) existe.
 */

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

export type Email = {
  para: string;
  assunto: string;
  textoSimples: string;
  html: string;
};

export function emailConfigurado(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_REMETENTE);
}

export async function enviarEmail(email: Email): Promise<void> {
  if (!emailConfigurado()) {
    // O corpo inteiro no log é proposital: em desenvolvimento é assim que se
    // pega o link de recuperação sem caixa de e-mail nenhuma.
    logger.warn(
      { para: email.para, assunto: email.assunto, corpo: email.textoSimples },
      "E-mail NÃO enviado (BREVO_API_KEY ausente) — conteúdo registrado no log",
    );
    return;
  }

  const resposta = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY!,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: process.env.EMAIL_REMETENTE,
        name: process.env.EMAIL_REMETENTE_NOME ?? "Barber Recall",
      },
      to: [{ email: email.para }],
      subject: email.assunto,
      textContent: email.textoSimples,
      htmlContent: email.html,
    }),
  });

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    // Lança para o chamador decidir. Na recuperação de senha o chamador engole
    // e responde 200 mesmo assim, porque revelar a falha revelaria que o e-mail
    // existe.
    throw new Error(`Brevo respondeu ${resposta.status}: ${detalhe.slice(0, 200)}`);
  }
}
