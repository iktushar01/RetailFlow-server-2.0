import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { PaymentController } from "./payment.controller";
import { paymentIdParamSchema, updatePaymentSchema } from "./payment.validation";

const router = Router();

router.get("/", PaymentController.getAll);
router.get(
    "/:id",
    validateRequest(paymentIdParamSchema, "params"),
    PaymentController.getById,
);
router.put(
    "/:id",
    validateRequest(paymentIdParamSchema, "params"),
    validateRequest(updatePaymentSchema),
    PaymentController.update,
);

export const PaymentRoutes = router;
