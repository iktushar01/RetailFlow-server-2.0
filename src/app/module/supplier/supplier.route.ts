import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { SupplierController } from "./supplier.controller";
import {
    createSupplierSchema,
    supplierIdParamSchema,
    updateSupplierSchema,
} from "./supplier.validation";

const router = Router();

router.get("/", SupplierController.getAll);
router.get(
    "/:id",
    validateRequest(supplierIdParamSchema, "params"),
    SupplierController.getById,
);
router.post(
    "/",
    validateRequest(createSupplierSchema),
    SupplierController.create,
);
router.put(
    "/:id",
    validateRequest(supplierIdParamSchema, "params"),
    validateRequest(updateSupplierSchema),
    SupplierController.update,
);
router.delete(
    "/:id",
    validateRequest(supplierIdParamSchema, "params"),
    SupplierController.remove,
);

export const SupplierRoutes = router;
