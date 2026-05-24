import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scanRouter from "./scan";
import alternativesRouter from "./alternatives";
import ocrCleanupRouter from "./ocr-cleanup";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scanRouter);
router.use(alternativesRouter);
router.use(ocrCleanupRouter);

export default router;
