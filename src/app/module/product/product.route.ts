import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { ProductController } from "./product.controller";
import {
    createProductSchema,
    productBarcodeParamSchema,
    productIdParamSchema,
    topSellingQuerySchema,
    updateProductPriceSchema,
    updateProductSchema,
} from "./product.validation";

const router = Router();

router.get("/top-selling", validateRequest(topSellingQuerySchema, "query"), ProductController.getTopSelling);
router.get(
    "/barcode/:barcode",
    validateRequest(productBarcodeParamSchema, "params"),
    ProductController.getByBarcode,
);
router.get("/", ProductController.getAll);
router.get(
    "/:id",
    validateRequest(productIdParamSchema, "params"),
    ProductController.getById,
);
router.post(
    "/",
    validateRequest(createProductSchema),
    ProductController.create,
);
router.put(
    "/:id",
    validateRequest(productIdParamSchema, "params"),
    validateRequest(updateProductSchema),
    ProductController.update,
);
router.patch(
    "/:id/price",
    validateRequest(productIdParamSchema, "params"),
    validateRequest(updateProductPriceSchema),
    ProductController.updatePrice,
);
router.delete(
    "/:id",
    validateRequest(productIdParamSchema, "params"),
    ProductController.remove,
);

export const ProductRoutes = router;
