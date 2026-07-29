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
import { capturarErro } from "./lib/alertas";

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
  // Informativo, não alerta: desde que o CRM web passou a ser servido por este
  // mesmo processo, a lista vazia é o estado correto e esperado. Navegador não
  // aplica CORS a requisição de mesma origem, então a ausência da variável não
  // bloqueia nada. Enquanto isto era um WARN dizendo "defina para liberar o CRM
  // web", mandava configurar o que não estava quebrado.
  //
  // Volta a importar se algum dia o front for servido de outro host — um
  // domínio próprio apontando para outro lugar, por exemplo.
  logger.info(
    "ALLOWED_ORIGINS não definida: só requisições de mesma origem são aceitas no navegador. " +
      "É o esperado enquanto o CRM web é servido por este processo.",
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
/**
 * Cabeçalhos de segurança, escritos à mão em vez de `helmet`.
 *
 * O conjunto padrão do helmet inclui uma Content-Security-Policy restritiva que
 * quebraria o CRM servido daqui — e afrouxá-la até funcionar daria uma política
 * que existe só para não atrapalhar, o pior dos dois mundos. Estes três não
 * dependem de ajuste, valem para API e para o front, e cobrem os ataques que se
 * aplicam a este sistema.
 *
 * CSP fica de fora conscientemente. Vale a pena quando alguém puder investir o
 * tempo de acertar as origens do bundle e do Mercado Pago; declarada às pressas,
 * ela quebra a tela de pagamento.
 */
app.use((_req, res, next) => {
  // Impede o navegador de "adivinhar" que um JSON é HTML e executá-lo.
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Sem isto o CRM pode ser embutido num iframe de outro site, que sobrepõe
  // botões invisíveis nos seus (clickjacking).
  res.setHeader("X-Frame-Options", "DENY");
  // Não vaza o caminho interno que o usuário estava vendo para sites externos —
  // inclui ids de cliente na URL.
  res.setHeader("Referrer-Policy", "same-origin");
  next();
});

// O limite padrão do Express já é 100 KB, mas declarado é diferente de herdado:
// quem lê este arquivo não precisa saber a versão do Express para saber que
// existe teto. Nenhum corpo legítimo desta API chega perto disso.
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

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
    // O comentário anterior dizia "already created in migration". Não há
    // migrações neste repositório — o único caminho de schema é
    // `drizzle-kit push`, e a tabela `session` não está no schema do drizzle
    // porque quem a gerencia é o connect-pg-simple. Na prática ela nunca foi
    // criada aqui, e o efeito ficou escondido: o app móvel usa token Bearer e
    // não toca em sessão, e o CRM web só foi publicado hoje. O login respondia
    // 200 mesmo sem conseguir gravar, e a requisição seguinte quebrava com 500.
    createTableIfMissing: true,
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

/**
 * Tratador final de erro.
 *
 * Sem ele o Express usa o padrão, que responde **HTML** — numa API que só fala
 * JSON. O cliente tenta interpretar a resposta, falha ao ler, e o erro que
 * chega na tela é sobre JSON malformado em vez de sobre o que realmente
 * aconteceu. Foi assim que a falha da tabela de sessões apareceu: um 500 com
 * corpo HTML, sem uma palavra sobre a causa.
 *
 * A resposta é deliberadamente vaga; o log é que carrega o detalhe. Mensagem de
 * erro interno na tela vira mapa para quem estiver sondando — nome de tabela,
 * caminho de arquivo, versão de biblioteca.
 *
 * Os quatro parâmetros são obrigatórios: é a assinatura pela qual o Express
 * reconhece um tratador de erro. Com três, ele vira middleware comum e nunca é
 * chamado.
 */
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  /*
   * Erros que já sabem o próprio código HTTP mantêm esse código.
   *
   * O body-parser lança `413 entity.too.large` quando o corpo passa do limite, e
   * o JSON malformado vira `400`. Responder 500 para os dois seria mentir para o
   * cliente — e mandar investigar o servidor quando o problema está na
   * requisição. Só 4xx é preservado: um 5xx vindo de biblioteca pode carregar
   * detalhe interno na mensagem.
   */
  const status = (err as { status?: unknown; statusCode?: unknown } | null)?.status
    ?? (err as { statusCode?: unknown } | null)?.statusCode;

  const ehErroDoCliente = typeof status === "number" && status >= 400 && status < 500;

  if (ehErroDoCliente) {
    logger.warn({ status, metodo: req.method, url: req.originalUrl }, "Requisição recusada");
    if (!res.headersSent) {
      res.status(status).json({ error: "Requisição inválida." });
    }
    return;
  }

  // capturarErro já registra no log e decide sozinho se avisa por e-mail.
  // Não é aguardado: a resposta ao cliente não deve esperar o envio.
  void capturarErro(err, { metodo: req.method, url: req.originalUrl });

  if (res.headersSent) return;

  res.status(500).json({ error: "Erro interno do servidor." });
});

export default app;
