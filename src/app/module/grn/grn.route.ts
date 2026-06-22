import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { GrnController } from "./grn.controller";
import {
    createGrnSchema,
    grnIdParamSchema,
    grnPoIdParamSchema,
    updateGrnSchema,
} from "./grn.validation";

const router = Router();

router.get("/", GrnController.getAll);
router.get(
    "/po/:poId/received",
    validateRequest(grnPoIdParamSchema, "params"),
    GrnController.getCumulativeReceivedByPo,
);
router.get(
    "/:id",
    validateRequest(grnIdParamSchema, "params"),
    GrnController.getById,
);
router.post("/", validateRequest(createGrnSchema), GrnController.create);
router.put(
    "/:id",
    validateRequest(grnIdParamSchema, "params"),
    validateRequest(updateGrnSchema),
    GrnController.update,
);
router.delete(
    "/:id",
    validateRequest(grnIdParamSchema, "params"),
    GrnController.remove,
);
router.patch(
    "/:id/approve",
    validateRequest(grnIdParamSchema, "params"),
    GrnController.approve,
);
router.patch(
    "/:id/reject",
    validateRequest(grnIdParamSchema, "params"),
    GrnController.reject,
);

export const GrnRoutes = router;
