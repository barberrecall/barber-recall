import { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, barbershopTable } from "@workspace/db";
import { computeTrialStatus } from "../lib/trial";

/**
 * Barra as rotas de dados quando a assinatura expirou.
 *
 * Até aqui o bloqueio era só de tela, no app e no CRM web. Quem tivesse o token
 * — uma versão antiga instalada, ou qualquer cliente HTTP — continuava lendo
 * clientes, agenda e relatórios depois do vencimento. Interface não é controle
 * de acesso.
 *
 * ── O que continua aberto, e por quê ────────────────────────────────────────
 *
 * `/barbershop`  o cliente precisa ler o próprio estado para saber que expirou
 *                e mostrar a tela certa. Bloquear aqui daria um erro genérico
 *                em vez de uma explicação. O PATCH também fica aberto: editar o
 *                próprio cadastro não entrega valor do produto, e trancar
 *                alguém fora dos próprios ajustes só gera suporte.
 * `/auth`        entrar e sair precisam funcionar sempre.
 * `/payment`     é por onde se volta a ter acesso. Bloquear seria uma armadilha
 *                sem saída.
 * `/admin`       o super admin administra todas as barbearias; o estado da
 *                assinatura dele não pode derrubar o painel.
 *
 * ── Custo ───────────────────────────────────────────────────────────────────
 *
 * Uma consulta a mais por requisição autenticada. É busca por chave primária, e
 * a alternativa — carregar o estado no login e guardar na sessão — deixaria um
 * pagamento recém-confirmado sem efeito até o próximo login, que é justamente a
 * hora em que o acesso precisa voltar na hora.
 *
 * ── 402 ─────────────────────────────────────────────────────────────────────
 *
 * `402 Payment Required` distingue "sua assinatura venceu" de `401` (não
 * autenticado) e `403` (esta conta não pode ver isto). Os clientes não dependem
 * desse código para decidir o que mostrar — eles leem `trialExpired` em
 * `/barbershop` —, mas quem estiver depurando merece a diferença.
 */
export async function requireActiveSubscription(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const barbershopId = req.session.barbershopId!;

  const [shop] = await db
    .select()
    .from(barbershopTable)
    .where(eq(barbershopTable.id, barbershopId));

  if (!shop) {
    res.status(404).json({ error: "Barbearia não encontrada." });
    return;
  }

  const trial = computeTrialStatus(shop);

  if (trial.trialExpired) {
    res.status(402).json({
      error: "Assinatura expirada.",
      trialExpired: true,
      plan: trial.plan,
    });
    return;
  }

  next();
}
