import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { SalesPaymentController } from "./salesPayment.controller";
import {
    createSalesPaymentSchema,
    salesPaymentIdParamSchema,
    salesPaymentInvoiceParamSchema,
    updateSalesPaymentSchema,
} from "./salesPayment.validation";

const router = Router();
router.get("/invoice/:invoiceNo", validateRequest(salesPaymentInvoiceParamSchema, "params"), SalesPaymentController.getByInvoiceNo);
router.get("/", SalesPaymentController.getAll);
router.get("/:id", validateRequest(salesPaymentIdParamSchema, "params"), SalesPaymentController.getById);
router.post("/", validateRequest(createSalesPaymentSchema), SalesPaymentController.create);
router.put("/:id", validateRequest(salesPaymentIdParamSchema, "params"), validateRequest(updateSalesPaymentSchema), SalesPaymentController.update);
router.delete("/:id", validateRequest(salesPaymentIdParamSchema, "params"), SalesPaymentController.remove);
export const SalesPaymentRoutes = router;
