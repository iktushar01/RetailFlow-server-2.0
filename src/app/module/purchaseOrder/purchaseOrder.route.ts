import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { PurchaseOrderController } from "./purchaseOrder.controller";
import {
    createPurchaseOrderSchema,
    purchaseOrderIdParamSchema,
    updatePurchaseOrderSchema,
    updatePurchaseOrderStatusSchema,
} from "./purchaseOrder.validation";

const router = Router();

router.get("/", PurchaseOrderController.getAll);
router.get(
    "/:id",
    validateRequest(purchaseOrderIdParamSchema, "params"),
    PurchaseOrderController.getById,
);
router.post(
    "/",
    validateRequest(createPurchaseOrderSchema),
    PurchaseOrderController.create,
);
router.put(
    "/:id",
    validateRequest(purchaseOrderIdParamSchema, "params"),
    validateRequest(updatePurchaseOrderSchema),
    PurchaseOrderController.update,
);
router.delete(
    "/:id",
    validateRequest(purchaseOrderIdParamSchema, "params"),
    PurchaseOrderController.remove,
);
router.patch(
    "/:id/send",
    validateRequest(purchaseOrderIdParamSchema, "params"),
    PurchaseOrderController.send,
);
router.patch(
    "/:id/status",
    validateRequest(purchaseOrderIdParamSchema, "params"),
    validateRequest(updatePurchaseOrderStatusSchema),
    PurchaseOrderController.updateStatus,
);

export const PurchaseOrderRoutes = router;
