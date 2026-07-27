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

// All routes below require authentication
router.use(requireAuth);

// Autenticado, mas sem exigir assinatura em dia.
//
// `/barbershop` é como o cliente descobre que expirou — bloqueá-lo daria um
// erro genérico no lugar da tela que explica o que houve. O painel de super
// admin passa por `requireAuth` (portanto tem sessão de barbearia própria), e o
// estado da assinatura dessa barbearia não pode derrubar a administração das
// outras. Ordem entre routers não afeta o casamento de rotas — os caminhos não
// colidem —, só define o que fica antes do portão.
router.use(barbershopRouter);
router.use(adminRouter); // adminOnly é aplicado dentro do router

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
