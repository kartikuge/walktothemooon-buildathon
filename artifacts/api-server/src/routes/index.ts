import { Router, type IRouter } from "express";
import healthRouter from "./health";
import moonRouter from "./moon";
import moonProfileRouter from "./moon-profile";
import moonMapsRouter from "./moon-maps";

const router: IRouter = Router();

router.use(healthRouter);
router.use(moonRouter);
router.use(moonProfileRouter);
router.use(moonMapsRouter);

export default router;
