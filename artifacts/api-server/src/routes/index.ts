import { Router, type IRouter } from "express";
import healthRouter from "./health";
import reflectionsRouter from "./reflections";
import dashboardRouter from "./dashboard";
import clustersRouter from "./clusters";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/reflections", reflectionsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/clusters", clustersRouter);
router.use("/admin", adminRouter);

export default router;
