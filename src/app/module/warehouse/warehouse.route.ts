import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { WarehouseController } from "./warehouse.controller";
import {
    createWarehouseSchema,
    updateWarehouseSchema,
    warehouseIdParamSchema,
} from "./warehouse.validation";

const router = Router();

router.get("/", WarehouseController.getAll);
router.get(
    "/:id",
    validateRequest(warehouseIdParamSchema, "params"),
    WarehouseController.getById,
);
router.post("/", validateRequest(createWarehouseSchema), WarehouseController.create);
router.put(
    "/:id",
    validateRequest(warehouseIdParamSchema, "params"),
    validateRequest(updateWarehouseSchema),
    WarehouseController.update,
);
router.delete(
    "/:id",
    validateRequest(warehouseIdParamSchema, "params"),
    WarehouseController.remove,
);

export const WarehouseRoutes = router;
