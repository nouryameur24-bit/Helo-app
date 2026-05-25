import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scanRouter from "./scan";
import alternativesRouter from "./alternatives";
import ocrCleanupRouter from "./ocr-cleanup";
// Lot 18-10 — Claude Vision direct (LE MOAT vs Yuka)
import analyzeIngredientsImageRouter from "./analyze-ingredients-image";
// Lot 19-I1 — Push recall RappelConso temps réel (cron-protected)
import recallsPollRouter from "./recalls-poll";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scanRouter);
router.use(alternativesRouter);
router.use(ocrCleanupRouter);
router.use(analyzeIngredientsImageRouter);
router.use(recallsPollRouter);

export default router;
