import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { SaleController } from "./sale.controller";
import {
    createSaleSchema,
    saleAnalyticsQuerySchema,
    saleIdParamSchema,
    saleInvoiceParamSchema,
    updateSaleSchema,
} from "./sale.validation";

const router = Router();

router.get("/analytics", validateRequest(saleAnalyticsQuerySchema, "query"), SaleController.analytics);
router.get("/summary", validateRequest(saleAnalyticsQuerySchema, "query"), SaleController.summary);
router.get("/top-products", validateRequest(saleAnalyticsQuerySchema, "query"), SaleController.topProducts);
router.get("/date-range", validateRequest(saleAnalyticsQuerySchema, "query"), SaleController.dateRange);
router.get("/export", validateRequest(saleAnalyticsQuerySchema, "query"), SaleController.exportData);
router.get("/invoice/:invoiceNo", validateRequest(saleInvoiceParamSchema, "params"), SaleController.getByInvoiceNo);
router.post("/hold", validateRequest(createSaleSchema), SaleController.hold);
router.get("/", SaleController.getAll);
router.get("/:id", validateRequest(saleIdParamSchema, "params"), SaleController.getById);
router.post("/", validateRequest(createSaleSchema), SaleController.create);
router.put(
    "/:id",
    validateRequest(saleIdParamSchema, "params"),
    validateRequest(updateSaleSchema),
    SaleController.update,
);
router.delete("/:id", validateRequest(saleIdParamSchema, "params"), SaleController.remove);

export const SaleRoutes = router;
