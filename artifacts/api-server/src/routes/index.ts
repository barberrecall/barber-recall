import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { requireActiveSubscription } from "../middleware/requireActiveSubscription";
import healthRouter from "./health";
import authRouter from "./auth";
import barbershopRouter from "./barbershop";
import clientsRouter from "./clients";
import barbersRouter from "./barbers";
import servicesRouter from "./services";
import appointmentsRouter from "./appointments";
import couponsRouter from "./coupons";
import campaignsRouter from "./campaigns";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import insightsRouter from "./insights";
import paymentRouter from "./payment";
import adminRouter from "./admin";
import adminAuthRouter from "./adminAuth";

const router: IRouter = Router();

// Public routes
router.use(healthRouter);
router.use(authRouter);
router.use(paymentRouter); // webhook endpoint is public; checkout is auth-guarded inside
router.use(adminAuthRouter); // admin login/logout/me — no user account required

/**
 * Painel de super admin.
 *
 * Fica antes do `requireAuth` porque tem guarda própria: `admin.ts` aplica
 * `adminOnly` a todo o prefixo `/admin`, e nenhuma rota dali lê
 * `req.session.barbershopId`.
 *
 * Enquanto estava depois, o painel não funcionava: `POST /admin/login`
 * respondia `authenticated: true`, `GET /admin/me` confirmava, e toda rota de
 * dados devolvia 401 — porque `requireAuth` exige sessão de barbearia, e um
 * super admin não é dono de barbearia nenhuma. A única forma de ver o painel
 * era estar logado nas duas coisas ao mesmo tempo, no mesmo navegador.
 */
router.use(adminRouter);

// All routes below require authentication
router.use(requireAuth);

// Autenticado, mas sem exigir assinatura em dia.
//
// `/barbershop` é como o cliente descobre que expirou — bloqueá-lo daria um
// erro genérico no lugar da tela que explica o que houve.
router.use(barbershopRouter);

// Daqui para baixo, assinatura em dia. Ver middleware/requireActiveSubscription.
router.use(requireActiveSubscription);
router.use(clientsRouter);
router.use(barbersRouter);
router.use(servicesRouter);
router.use(appointmentsRouter);
router.use(couponsRouter);
router.use(campaignsRouter);
router.use(notificationsRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(insightsRouter);

export default router;
