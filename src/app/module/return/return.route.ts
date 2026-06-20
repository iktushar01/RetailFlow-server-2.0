import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { ReturnController } from "./return.controller";
import { createReturnSchema, returnIdParamSchema } from "./return.validation";

const router = Router();
router.get("/", ReturnController.getAll);
router.post("/", validateRequest(createReturnSchema), ReturnController.create);
router.patch("/:id/approve", validateRequest(returnIdParamSchema, "params"), ReturnController.approve);
router.patch("/:id/reject", validateRequest(returnIdParamSchema, "params"), ReturnController.reject);
router.delete("/:id", validateRequest(returnIdParamSchema, "params"), ReturnController.remove);
export const ReturnRoutes = router;
