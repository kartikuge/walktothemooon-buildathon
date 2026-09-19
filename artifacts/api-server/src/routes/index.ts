import { Router, type IRouter } from "express";
import healthRouter from "./health";
import moonRouter from "./moon";

const router: IRouter = Router();

router.use(healthRouter);
router.use(moonRouter);

export default router;
