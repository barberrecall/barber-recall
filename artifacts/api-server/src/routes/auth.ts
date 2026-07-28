import { Router, type IRouter, type Request } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, barbershopTable } from "@workspace/db";
import { createAuthToken } from "../lib/authToken";

const router: IRouter = Router();

/**
 * Native clients opt in by sending `issueToken: true`; they get a Bearer token
 * because React Native has no dependable persistent cookie jar.
 *
 * Browsers deliberately do NOT get one. The web session lives in an httpOnly
 * cookie precisely so that script on the page cannot read it — returning a
 * long-lived token in the response body would hand XSS the very credential the
 * cookie is protecting.
 */
function wantsToken(body: unknown): boolean {
  return (body as { issueToken?: unknown } | null)?.issueToken === true;
}

/**
 * Grava a sessão antes de responder.
 *
 * Sem isto, a resposta do login saía antes de a sessão estar legível no
 * Postgres, e a primeira requisição do cliente — que chega em milissegundos —
 * caía em 401. Medido em 25 a 90% de falha conforme a carga; reenviar o mesmo
 * cookie logo depois funcionava, o que prova que o cookie estava correto e só a
 * leitura ainda não enxergava a linha.
 *
 * O sintoma para quem usa: entrar no CRM e cair de volta na tela de login, ou
 * ver a primeira tela vazia. Como o `express-session` grava ao encerrar a
 * resposta, o único jeito de garantir a ordem é pedir a gravação aqui e só
 * responder no retorno dela.
 *
 * Custa uma ida ao banco antes de responder, e só no login e no cadastro — não
 * em toda requisição.
 */
function saveSession(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

// POST /auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, senha, nomeDono, nomeBarbearia } = req.body as {
    email?: string;
    senha?: string;
    nomeDono?: string;
    nomeBarbearia?: string;
  };

  if (!email || !senha || !nomeDono || !nomeBarbearia) {
    res.status(400).json({ error: "Todos os campos são obrigatórios." });
    return;
  }
  if (senha.length < 6) {
    res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
    return;
  }

  // Check if email is already taken
  const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (existing) {
    res.status(409).json({ error: "Este e-mail já está cadastrado." });
    return;
  }

  const passwordHash = await bcrypt.hash(senha, 12);

  // Create user + barbershop atomically so a partial failure leaves no orphan user
  const { user, shop } = await db.transaction(async (tx) => {
    const [newUser] = await tx.insert(usersTable).values({
      email: email.toLowerCase().trim(),
      passwordHash,
      nome: nomeDono.trim(),
    }).returning();

    const [newShop] = await tx.insert(barbershopTable).values({
      userId: newUser.id,
      nome: nomeBarbearia.trim(),
      email: email.toLowerCase().trim(),
    }).returning();

    return { user: newUser, shop: newShop };
  });

  // Start session — skipped for native clients, whose identity travels in the
  // token, so logging in from the app does not leave an unused session row.
  if (!wantsToken(req.body)) {
    req.session.userId = user.id;
    req.session.barbershopId = shop.id;
    await saveSession(req);
  }

  res.status(201).json({
    user: { id: user.id, email: user.email, nome: user.nome },
    barbershopId: shop.id,
    ...(wantsToken(req.body) ? { token: createAuthToken(user.id, shop.id) } : {}),
  });
});

// POST /auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, senha, rememberMe } = req.body as { email?: string; senha?: string; rememberMe?: boolean };

  if (!email || !senha) {
    res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
  if (!user) {
    res.status(401).json({ error: "E-mail ou senha incorretos." });
    return;
  }

  const valid = await bcrypt.compare(senha, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "E-mail ou senha incorretos." });
    return;
  }

  const [shop] = await db.select({ id: barbershopTable.id }).from(barbershopTable).where(eq(barbershopTable.userId, user.id));
  if (!shop) {
    res.status(500).json({ error: "Barbearia não encontrada para este usuário." });
    return;
  }

  // Native clients carry their identity in the returned token, so no server
  // session is created for them — otherwise every app login would leave an
  // unused row in the Postgres session store.
  if (!wantsToken(req.body)) {
    req.session.userId = user.id;
    req.session.barbershopId = shop.id;

    // "Lembrar-me" desativado: torna o cookie de sessão (some ao fechar o browser)
    if (!rememberMe) {
      // express-session aceita `false` em runtime para criar session cookie,
      // mas os tipos declaram apenas Date — usamos cast para contornar
      (req.session.cookie as unknown as { expires: boolean }).expires = false;
    }

    await saveSession(req);
  }

  res.json({
    user: { id: user.id, email: user.email, nome: user.nome },
    barbershopId: shop.id,
    ...(wantsToken(req.body) ? { token: createAuthToken(user.id, shop.id) } : {}),
  });
});

// POST /auth/logout
router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// GET /auth/me
router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session?.userId || !req.session?.barbershopId) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }
  const [user] = await db.select({ id: usersTable.id, email: usersTable.email, nome: usersTable.nome })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));
  if (!user) {
    res.status(401).json({ error: "Sessão inválida." });
    return;
  }
  res.json({ user, barbershopId: req.session.barbershopId });
});

export default router;
