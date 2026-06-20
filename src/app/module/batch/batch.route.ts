import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { BatchController } from "./batch.controller";
import {
    batchIdParamSchema,
    createBatchSchema,
    updateBatchSchema,
} from "./batch.validation";

const router = Router();

router.get("/", BatchController.getAll);
router.post("/", validateRequest(createBatchSchema), BatchController.create);
router.put(
    "/:id",
    validateRequest(batchIdParamSchema, "params"),
    validateRequest(updateBatchSchema),
    BatchController.update,
);
router.delete(
    "/:id",
    validateRequest(batchIdParamSchema, "params"),
    BatchController.remove,
);

export const BatchRoutes = router;
