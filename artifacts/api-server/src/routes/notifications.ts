import { Router, type IRouter } from "express";
import { eq, and, lt, isNotNull, sql, not, exists } from "drizzle-orm";
import {
  db,
  notificationsTable,
  campaignsTable,
  clientsTable,
  barbershopTable,
  couponsTable,
} from "@workspace/db";
import { getDiasRetorno, needsRecallContactSql } from "../lib/recall";

const router: IRouter = Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return null; // invalid number
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function resolveMessage(
  template: string,
  params: {
    nome: string;
    barbearia: string;
    dias: number | null;
    cupomCodigo: string | null;
  }
): string {
  return template
    .replace(/\{nome\}/gi, params.nome)
    .replace(/\{barbearia\}/gi, params.barbearia)
    .replace(/\{dias\}/gi, params.dias !== null ? String(params.dias) : "")
    .replace(/\{cupom_texto\}/gi, params.cupomCodigo ?? "");
}

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

// ─── GET /notifications — list with enriched data ────────────────────────────
router.get("/notifications", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const { status } = req.query as { status?: string };

  const [shop] = await db
    .select({ nome: barbershopTable.nome })
    .from(barbershopTable)
    .where(eq(barbershopTable.id, barbershopId));

  const conditions = [eq(notificationsTable.barbershopId, barbershopId)];
  if (status) conditions.push(eq(notificationsTable.status, status));

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(and(...conditions))
    .orderBy(notificationsTable.scheduledAt);

  const result = await Promise.all(
    rows.map(async (n) => {
      const [client] = await db
        .select({ nome: clientsTable.nome, telefone: clientsTable.telefone, ultimoAtendimento: clientsTable.ultimoAtendimento })
        .from(clientsTable)
        .where(eq(clientsTable.id, n.clientId));

      const [campaign] = await db
        .select({ nome: campaignsTable.nome, mensagem: campaignsTable.mensagem, cupomId: campaignsTable.cupomId })
        .from(campaignsTable)
        .where(eq(campaignsTable.id, n.campaignId));

      let cupomCodigo: string | null = null;
      if (campaign?.cupomId) {
        const [coupon] = await db
          .select({ codigo: couponsTable.codigo })
          .from(couponsTable)
          .where(eq(couponsTable.id, campaign.cupomId));
        cupomCodigo = coupon?.codigo ?? null;
      }

      const dias = daysSince(client?.ultimoAtendimento ?? null);
      const mensagemResolvida = campaign?.mensagem
        ? resolveMessage(campaign.mensagem, {
            nome: client?.nome ?? "",
            barbearia: shop?.nome ?? "",
            dias,
            cupomCodigo,
          })
        : null;

      const formattedPhone = client?.telefone ? formatPhone(client.telefone) : null;
      const waLink =
        formattedPhone && mensagemResolvida
          ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensagemResolvida)}`
          : null;

      return {
        id: n.id,
        clientId: n.clientId,
        clienteNome: client?.nome ?? null,
        clienteTelefone: client?.telefone ?? null,
        clienteUltimoAtendimento: client?.ultimoAtendimento?.toISOString() ?? null,
        diasSemVisita: dias,
        campaignId: n.campaignId,
        campaignNome: campaign?.nome ?? null,
        mensagemResolvida,
        waLink,
        status: n.status,
        scheduledAt: n.scheduledAt.toISOString(),
        sentAt: n.sentAt?.toISOString() ?? null,
        opened: n.opened,
        clicked: n.clicked,
      };
    })
  );

  res.json(result);
});

// ─── POST /notifications/generate — create pending dispatches for today ───────
router.post("/notifications/generate", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  let generated = 0;

  try {
    const campaigns = await db
      .select()
      .from(campaignsTable)
      .where(and(eq(campaignsTable.barbershopId, barbershopId), eq(campaignsTable.ativo, true)));

    const now = new Date();
    // Piso de recall: campanhas de retorno nunca falam com quem a barbearia
    // ainda considera `active`. Fonte de verdade única em ../lib/recall — esta
    // rota não recalcula a regra (skills `client-recall-logic` e
    // `campanhas-whatsapp`).
    const precisaContato = needsRecallContactSql(await getDiasRetorno(barbershopId));

    for (const campaign of campaigns) {
      if (campaign.tipo === "return" || campaign.tipo === "custom") {
        // Find clients whose last visit was >= campaign.dias days ago
        const cutoff = new Date(now.getTime() - campaign.dias * 24 * 60 * 60 * 1000);

        const eligible = await db
          .select({ id: clientsTable.id })
          .from(clientsTable)
          .where(
            and(
              eq(clientsTable.barbershopId, barbershopId),
              eq(clientsTable.ativo, true),
              // Quem nunca foi atendido fica de fora, mesmo que o recall já o
              // conte como `at_risk` pelo `created_at`: a mensagem de retorno
              // fala de uma visita que não existe. Divergência intencional com
              // o KPI do Dashboard.
              isNotNull(clientsTable.ultimoAtendimento),
              precisaContato,
              // Afinação por campanha, por cima do piso de recall.
              lt(clientsTable.ultimoAtendimento, cutoff),
              not(
                exists(
                  db
                    .select({ id: notificationsTable.id })
                    .from(notificationsTable)
                    .where(
                      and(
                        eq(notificationsTable.clientId, clientsTable.id),
                        eq(notificationsTable.campaignId, campaign.id),
                        // idempotent: no notification for this campaign.dias window already exists
                        sql`${notificationsTable.scheduledAt} >= ${cutoff}`
                      )
                    )
                )
              )
            )
          );

        if (eligible.length > 0) {
          await db.insert(notificationsTable).values(
            eligible.map((c) => ({
              barbershopId,
              clientId: c.id,
              campaignId: campaign.id,
              status: "pending" as const,
              scheduledAt: now,
            }))
          );
          generated += eligible.length;
        }
      } else if (campaign.tipo === "birthday") {
        // Clients whose birthday is today
        const todayMonth = now.getMonth() + 1; // JS months 0-indexed
        const todayDay = now.getDate();
        const thisYear = now.getFullYear();
        const yearStart = new Date(thisYear, 0, 1);

        const eligible = await db
          .select({ id: clientsTable.id })
          .from(clientsTable)
          .where(
            and(
              eq(clientsTable.barbershopId, barbershopId),
              eq(clientsTable.ativo, true),
              isNotNull(clientsTable.dataNascimento),
              sql`EXTRACT(MONTH FROM ${clientsTable.dataNascimento}::date) = ${todayMonth}`,
              sql`EXTRACT(DAY FROM ${clientsTable.dataNascimento}::date) = ${todayDay}`,
              not(
                exists(
                  db
                    .select({ id: notificationsTable.id })
                    .from(notificationsTable)
                    .where(
                      and(
                        eq(notificationsTable.clientId, clientsTable.id),
                        eq(notificationsTable.campaignId, campaign.id),
                        sql`${notificationsTable.scheduledAt} >= ${yearStart}`
                      )
                    )
                )
              )
            )
          );

        if (eligible.length > 0) {
          await db.insert(notificationsTable).values(
            eligible.map((c) => ({
              barbershopId,
              clientId: c.id,
              campaignId: campaign.id,
              status: "pending" as const,
              scheduledAt: now,
            }))
          );
          generated += eligible.length;
        }
      } else if (campaign.tipo === "loyalty") {
        // Guard: skip invalid campaigns (dias=0 would cause division by zero in DB)
        if (campaign.dias <= 0) continue;

        // Clients whose totalVisitas is a multiple of campaign.dias (e.g. every 10 visits)
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const eligible = await db
          .select({ id: clientsTable.id, totalVisitas: clientsTable.totalVisitas })
          .from(clientsTable)
          .where(
            and(
              eq(clientsTable.barbershopId, barbershopId),
              eq(clientsTable.ativo, true),
              sql`${clientsTable.totalVisitas} > 0`,
              sql`${clientsTable.totalVisitas} % ${campaign.dias} = 0`,
              not(
                exists(
                  db
                    .select({ id: notificationsTable.id })
                    .from(notificationsTable)
                    .where(
                      and(
                        eq(notificationsTable.clientId, clientsTable.id),
                        eq(notificationsTable.campaignId, campaign.id),
                        sql`${notificationsTable.scheduledAt} >= ${sevenDaysAgo}`
                      )
                    )
                )
              )
            )
          );

        if (eligible.length > 0) {
          await db.insert(notificationsTable).values(
            eligible.map((c) => ({
              barbershopId,
              clientId: c.id,
              campaignId: campaign.id,
              status: "pending" as const,
              scheduledAt: now,
            }))
          );
          generated += eligible.length;
        }
      }
    }

    res.json({ generated });
  } catch (err) {
    const logger = (await import("../lib/logger.js")).logger;
    logger.error({ err }, "Erro ao gerar notificações");
    res.status(500).json({ error: "Erro ao gerar disparos." });
  }
});

// ─── PATCH /notifications/:id/sent — mark as sent ────────────────────────────
router.patch("/notifications/:id/sent", async (req, res): Promise<void> => {
  const barbershopId = req.session.barbershopId!;
  const id = parseInt(
    Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
    10
  );
  if (isNaN(id)) {
    res.status(400).json({ error: "id inválido" });
    return;
  }

  const [updated] = await db
    .update(notificationsTable)
    .set({ status: "sent", sentAt: new Date() })
    .where(
      and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.barbershopId, barbershopId)
      )
    )
    .returning({ id: notificationsTable.id });

  if (!updated) {
    res.status(404).json({ error: "Notificação não encontrada." });
    return;
  }

  res.json({ ok: true });
});

export default router;
