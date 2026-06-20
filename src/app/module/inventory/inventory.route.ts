import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { InventoryController } from "./inventory.controller";
import {
    createInventorySchema,
    inventoryIdParamSchema,
    inventoryProductIdParamSchema,
    lowStockParamSchema,
    updateInventoryBarcodeSchema,
    updateInventorySchema,
    updateInventoryStockSchema,
} from "./inventory.validation";

const router = Router();

router.get("/products", InventoryController.getProducts);
router.get(
    "/low-stock/:threshold",
    validateRequest(lowStockParamSchema, "params"),
    InventoryController.getLowStock,
);
router.get(
    "/product/:productId",
    validateRequest(inventoryProductIdParamSchema, "params"),
    InventoryController.getByProductId,
);
router.get("/", InventoryController.getAll);
router.get(
    "/:id",
    validateRequest(inventoryIdParamSchema, "params"),
    InventoryController.getById,
);
router.post("/", validateRequest(createInventorySchema), InventoryController.create);
router.put(
    "/:id",
    validateRequest(inventoryIdParamSchema, "params"),
    validateRequest(updateInventorySchema),
    InventoryController.update,
);
router.patch(
    "/:id/stock",
    validateRequest(inventoryIdParamSchema, "params"),
    validateRequest(updateInventoryStockSchema),
    InventoryController.updateStock,
);
router.patch(
    "/:id/barcode",
    validateRequest(inventoryIdParamSchema, "params"),
    validateRequest(updateInventoryBarcodeSchema),
    InventoryController.updateBarcode,
);
router.delete(
    "/:id",
    validateRequest(inventoryIdParamSchema, "params"),
    InventoryController.remove,
);

export const InventoryRoutes = router;
