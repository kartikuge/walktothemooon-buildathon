import { Router, type IRouter } from "express";
import healthRouter from "./health";
import moonRouter from "./moon";
import moonProfileRouter from "./moon-profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(moonRouter);
router.use(moonProfileRouter);

export default router;
