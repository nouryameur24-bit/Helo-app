import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scanRouter from "./scan";
import alternativesRouter from "./alternatives";
import ocrCleanupRouter from "./ocr-cleanup";
// Lot 18-10 — Claude Vision direct (LE MOAT vs Yuka)
import analyzeIngredientsImageRouter from "./analyze-ingredients-image";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scanRouter);
router.use(alternativesRouter);
router.use(ocrCleanupRouter);
router.use(analyzeIngredientsImageRouter);

export default router;
