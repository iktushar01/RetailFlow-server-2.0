import { Router } from "express";
import { AiController } from "./ai.controller";

const router = Router();

router.post("/reorder-suggestions", AiController.reorderSuggestions);
router.get("/reorder-suggestions", AiController.reorderSuggestions);
router.post("/query", AiController.query);

export const AiRoutes = router;
