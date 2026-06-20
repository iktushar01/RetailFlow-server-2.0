import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { InventoryController } from "./inventory.controller";
import {
    inventoryIdParamSchema,
    updateInventoryBarcodeSchema,
} from "./inventory.validation";

const router = Router();

router.patch(
    "/:id/barcode",
    validateRequest(inventoryIdParamSchema, "params"),
    validateRequest(updateInventoryBarcodeSchema),
    InventoryController.updateBarcode,
);

export const InventoryRoutes = router;
