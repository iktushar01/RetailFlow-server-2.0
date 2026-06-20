import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { PaymentController } from "./payment.controller";
import { paymentIdParamSchema, createPaymentSchema, updatePaymentSchema } from "./payment.validation";

const router = Router();

router.get("/", PaymentController.getAll);
router.get(
    "/:id",
    validateRequest(paymentIdParamSchema, "params"),
    PaymentController.getById,
);
router.post("/", validateRequest(createPaymentSchema), PaymentController.create);
router.put(
    "/:id",
    validateRequest(paymentIdParamSchema, "params"),
    validateRequest(updatePaymentSchema),
    PaymentController.update,
);
router.delete(
    "/:id",
    validateRequest(paymentIdParamSchema, "params"),
    PaymentController.remove,
);

export const PaymentRoutes = router;
