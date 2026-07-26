import { Router, type IRouter } from "express";
import { db, usersTable, barbershopTable } from "@workspace/db";
import { eq, sql, and, lte, isNull, or } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";

const router: IRouter = Router();

// All admin routes require admin privileges
router.use("/admin", adminOnly);

// ─── GET /admin/stats ───────────────────────────────────────────────────────
// Returns aggregate counts: total, pro, trial (active), expired, free (no trial).
router.get("/admin/stats", async (_req, res): Promise<void> => {
  const now = new Date();
  const trialDays = 7; // trial period in days

  const rows = await db
    .select({
      plan: barbershopTable.plan,
      planExpiresAt: barbershopTable.planExpiresAt,
      trialStartsAt: barbershopTable.trialStartsAt,
    })
    .from(barbershopTable);

  let total = 0;
  let pro = 0;
  let trialActive = 0;
  let trialExpired = 0;

  for (const row of rows) {
    total++;
    if (row.plan === "pro") {
      pro++;
      continue;
    }
    // free plan — check trial
    const trialEnd = new Date(row.trialStartsAt.getTime() + trialDays * 86400_000);
    if (now < trialEnd) {
      trialActive++;
    } else {
      trialExpired++;
    }
  }

  res.json({ total, pro, trialActive, trialExpired });
});

// ─── GET /admin/users ───────────────────────────────────────────────────────
// Returns all barbershops joined with user data.
router.get("/admin/users", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      barbershopId: barbershopTable.id,
      nomeBarbearia: barbershopTable.nome,
      telefone: barbershopTable.telefone,
      email: barbershopTable.email,
      cidade: barbershopTable.cidade,
      whatsapp: barbershopTable.whatsapp,
      plan: barbershopTable.plan,
      planExpiresAt: barbershopTable.planExpiresAt,
      trialStartsAt: barbershopTable.trialStartsAt,
      createdAt: barbershopTable.createdAt,
      nomeDono: usersTable.nome,
      userEmail: usersTable.email,
    })
    .from(barbershopTable)
    .leftJoin(usersTable, eq(barbershopTable.userId, usersTable.id))
    .orderBy(sql`${barbershopTable.createdAt} DESC`);

  const now = new Date();
  const trialDays = 7;

  const users = rows.map((row) => {
    const trialEnd = new Date(row.trialStartsAt.getTime() + trialDays * 86400_000);
    const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400_000));
    const trialExpired = row.plan === "free" && now >= trialEnd;
    return {
      ...row,
      trialExpired,
      daysRemaining: row.plan === "free" ? daysRemaining : null,
    };
  });

  res.json(users);
});

// ─── PATCH /admin/users/:barbershopId/plan ──────────────────────────────────
// Manually set a barbershop's plan: { plan: "free" | "pro", months?: number }
router.patch("/admin/users/:barbershopId/plan", async (req, res): Promise<void> => {
  const barbershopId = parseInt(req.params.barbershopId, 10);
  if (isNaN(barbershopId)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }

  const { plan, months } = req.body as { plan?: string; months?: number };
  if (plan !== "free" && plan !== "pro") {
    res.status(400).json({ error: "Plano deve ser 'free' ou 'pro'." });
    return;
  }

  // months is required for pro plan — prevents accidental lifetime subscriptions
  if (plan === "pro" && (typeof months !== "number" || !Number.isInteger(months) || months < 1 || months > 120)) {
    res.status(400).json({ error: "Para plano Pro, informe 'months' entre 1 e 120." });
    return;
  }

  let planExpiresAt: Date | null = null;
  if (plan === "pro") {
    planExpiresAt = new Date();
    planExpiresAt.setMonth(planExpiresAt.getMonth() + (months as number));
  }

  const [updated] = await db
    .update(barbershopTable)
    .set({ plan, planExpiresAt })
    .where(eq(barbershopTable.id, barbershopId))
    .returning({ id: barbershopTable.id, plan: barbershopTable.plan, planExpiresAt: barbershopTable.planExpiresAt });

  if (!updated) {
    res.status(404).json({ error: "Barbearia não encontrada." });
    return;
  }

  res.json(updated);
});

// ─── GET /admin/trial-expiring ──────────────────────────────────────────────
// Returns barbershops on free plan whose trial expires in ≤2 days (not yet expired).
router.get("/admin/trial-expiring", async (_req, res): Promise<void> => {
  const now = new Date();
  const trialDays = 7;

  const rows = await db
    .select({
      barbershopId: barbershopTable.id,
      nomeBarbearia: barbershopTable.nome,
      whatsapp: barbershopTable.whatsapp,
      telefone: barbershopTable.telefone,
      email: barbershopTable.email,
      plan: barbershopTable.plan,
      trialStartsAt: barbershopTable.trialStartsAt,
      trialNotifiedAt: barbershopTable.trialNotifiedAt,
      nomeDono: usersTable.nome,
      userEmail: usersTable.email,
    })
    .from(barbershopTable)
    .leftJoin(usersTable, eq(barbershopTable.userId, usersTable.id))
    .where(eq(barbershopTable.plan, "free"))
    .orderBy(barbershopTable.trialStartsAt);

  const twoDaysMs = 2 * 86400_000;
  const result = rows
    .map((row) => {
      const trialEnd = new Date(row.trialStartsAt.getTime() + trialDays * 86400_000);
      const msRemaining = trialEnd.getTime() - now.getTime();
      const daysRemaining = Math.ceil(msRemaining / 86400_000);
      return { ...row, trialEnd, daysRemaining };
    })
    .filter((row) => row.daysRemaining >= 0 && row.daysRemaining <= 2)
    .map(({ trialEnd, daysRemaining, ...row }) => {
      const phone = (row.whatsapp || row.telefone || "").replace(/\D/g, "");
      const formattedPhone = phone.length >= 10 ? (phone.startsWith("55") ? phone : `55${phone}`) : null;
      const message = `Olá${row.nomeDono ? `, ${row.nomeDono}` : ""}! 👋 Seu trial do *Barber Recall* expira em ${daysRemaining === 0 ? "hoje" : `${daysRemaining} dia${daysRemaining > 1 ? "s" : ""}`}. Assine o plano Pro para continuar usando todas as funcionalidades sem interrupção. 🚀`;
      const waLink = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}` : null;
      return {
        barbershopId: row.barbershopId,
        nomeBarbearia: row.nomeBarbearia,
        nomeDono: row.nomeDono,
        userEmail: row.userEmail ?? row.email,
        whatsapp: row.whatsapp,
        daysRemaining,
        trialNotifiedAt: row.trialNotifiedAt?.toISOString() ?? null,
        waLink,
        message,
      };
    });

  res.json(result);
});

// ─── POST /admin/trial-expiring/:barbershopId/notify ────────────────────────
// Marks a barbershop as notified (records timestamp).
router.post("/admin/trial-expiring/:barbershopId/notify", async (req, res): Promise<void> => {
  const barbershopId = parseInt(req.params.barbershopId, 10);
  if (isNaN(barbershopId)) {
    res.status(400).json({ error: "ID inválido." });
    return;
  }

  const [updated] = await db
    .update(barbershopTable)
    .set({ trialNotifiedAt: new Date() })
    .where(eq(barbershopTable.id, barbershopId))
    .returning({ id: barbershopTable.id, trialNotifiedAt: barbershopTable.trialNotifiedAt });

  if (!updated) {
    res.status(404).json({ error: "Barbearia não encontrada." });
    return;
  }

  res.json({ ok: true, trialNotifiedAt: updated.trialNotifiedAt?.toISOString() });
});

export default router;
