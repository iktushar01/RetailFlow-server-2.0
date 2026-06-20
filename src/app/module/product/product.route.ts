import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { ProductController } from "./product.controller";
import {
    createProductSchema,
    productIdParamSchema,
    updateProductSchema,
} from "./product.validation";

const router = Router();

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
router.delete(
    "/:id",
    validateRequest(productIdParamSchema, "params"),
    ProductController.remove,
);

export const ProductRoutes = router;
