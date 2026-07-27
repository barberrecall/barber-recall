import path from "node:path";
import { existsSync } from "node:fs";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import router from "./routes";
import { logger } from "./lib/logger";
import { bearerAuth } from "./middleware/bearerAuth";

const app: Express = express();

// Trust the first proxy in front of the app (Replit's reverse proxy).
// Required for secure cookies (HTTPS) and correct IP detection in production.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

/**
 * CORS.
 *
 * `origin: true` reflete qualquer origem, e combinado com `credentials: true`
 * isso permitiria a qualquer site fazer requisições autenticadas contra a API.
 * Aceitável numa LAN, inaceitável numa URL pública.
 *
 * Em produção, portanto, a lista vem de `ALLOWED_ORIGINS` (separada por vírgula)
 * e nada fora dela passa. Em desenvolvimento segue permissivo, porque o Vite
 * troca de porta e o Expo serve de um IP de LAN variável.
 *
 * O app móvel não é afetado: CORS é imposto por navegadores, e requisições
 * nativas não enviam `Origin`. Isto protege o CRM web, que autentica por cookie.
 */
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  logger.warn(
    "ALLOWED_ORIGINS não definida em produção: nenhuma origem de navegador será aceita. " +
      "O app móvel continua funcionando; defina a variável para liberar o CRM web.",
  );
}

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? allowedOrigins
        : true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Fail fast if SESSION_SECRET is missing in production
if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required in production.");
}

// Native clients (Expo app) authenticate with a Bearer token instead of a
// cookie. This must run before the session middleware so it can decide whether
// a cookie session is needed at all.
app.use(bearerAuth);

// Session middleware with PostgreSQL store
const PgStore = connectPgSimple(session);
const sessionMiddleware = session({
  store: new PgStore({
    conString: process.env.DATABASE_URL,
    tableName: "session",
    createTableIfMissing: false, // already created in migration
  }),
  secret: process.env.SESSION_SECRET ?? "dev-only-insecure-secret-do-not-use-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
});

app.use((req, res, next) => {
  // A token-authenticated request already carries its identity in the header,
  // and `bearerAuth` has populated req.session. Running the cookie session
  // middleware here would persist a throwaway row in the Postgres session
  // store on every request from the app, so skip it entirely.
  if (req.tokenAuth) {
    next();
    return;
  }

  sessionMiddleware(req, res, next);
});

app.use("/api", router);

/**
 * Serve o CRM web pelo mesmo servidor da API.
 *
 * Não é economia de infraestrutura, é o que faz a cobrança funcionar. O
 * Mercado Pago precisa de uma URL pública de retorno e de webhook (`APP_URL`),
 * e o app móvel precisa de um endereço real para onde mandar quem vai assinar.
 * Sem um front publicado, o bloqueio por assinatura vira tranca sem chave.
 *
 * Mesma origem também dispensa `ALLOWED_ORIGINS`: o navegador não faz
 * requisição cruzada quando a página e a API dividem o host, e o cookie de
 * sessão viaja sem depender de configuração de CORS.
 *
 * Fica depois de `/api` de propósito. O fallback de SPA responde qualquer
 * caminho que não casou antes, e se viesse primeiro devolveria o index.html
 * para rotas de API inexistentes — trocando um 404 honesto por uma página HTML
 * que quebraria o cliente longe da causa.
 */
const webDir = path.resolve(import.meta.dirname, "..", "..", "barber-crm", "dist", "public");

if (existsSync(webDir)) {
  app.use(express.static(webDir));

  app.get("/{*path}", (req, res, next) => {
    // Um 404 de API já foi respondido acima; aqui só chega o que sobrou.
    if (req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(path.join(webDir, "index.html"));
  });
} else {
  logger.warn(
    { webDir },
    "CRM web não encontrado — servindo apenas a API. Rode o build de barber-crm para publicar o front.",
  );
}

export default app;
