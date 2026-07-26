import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

// POST /admin/login — authenticate as admin using ADMIN_EMAIL + ADMIN_PASSWORD env secrets
router.post("/admin/login", async (req, res): Promise<void> => {
  const { email, senha } = req.body as { email?: string; senha?: string };

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPasswordHash) {
    res.status(503).json({ error: "Admin não configurado." });
    return;
  }

  if (!email || !senha) {
    res.status(400).json({ error: "E-mail e senha são obrigatórios." });
    return;
  }

  const emailMatch = email.toLowerCase().trim() === adminEmail.toLowerCase();

  // ADMIN_PASSWORD may be stored as plain text or bcrypt hash — support both
  let passwordMatch = false;
  if (adminPasswordHash.startsWith("$2")) {
    passwordMatch = await bcrypt.compare(senha, adminPasswordHash);
  } else {
    passwordMatch = senha === adminPasswordHash;
  }

  if (!emailMatch || !passwordMatch) {
    res.status(401).json({ error: "Credenciais inválidas." });
    return;
  }

  req.session.adminAuthenticated = true;
  res.json({ authenticated: true });
});

// POST /admin/logout
router.post("/admin/logout", (req, res): void => {
  req.session.adminAuthenticated = false;
  res.json({ success: true });
});

// GET /admin/me — check current admin session status
router.get("/admin/me", (req, res): void => {
  res.json({ authenticated: Boolean(req.session?.adminAuthenticated) });
});

export default router;
