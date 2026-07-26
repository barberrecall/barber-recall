import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/requireAuth";
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
router.use(barbershopRouter);
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

// Admin routes (adminOnly middleware is applied inside the router)
router.use(adminRouter);

export default router;
