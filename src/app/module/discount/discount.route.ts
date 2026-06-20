import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { DiscountController } from "./discount.controller";
import { createDiscountSchema, discountIdParamSchema, updateDiscountSchema } from "./discount.validation";

const router = Router();
router.get("/active", DiscountController.getActive);
router.get("/", DiscountController.getAll);
router.get("/:id", validateRequest(discountIdParamSchema, "params"), DiscountController.getById);
router.post("/", validateRequest(createDiscountSchema), DiscountController.create);
router.put("/:id", validateRequest(discountIdParamSchema, "params"), validateRequest(updateDiscountSchema), DiscountController.update);
router.patch("/:id/toggle", validateRequest(discountIdParamSchema, "params"), DiscountController.toggle);
router.delete("/:id", validateRequest(discountIdParamSchema, "params"), DiscountController.remove);
export const DiscountRoutes = router;
