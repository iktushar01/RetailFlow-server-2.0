import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { StockTransferController } from "./stockTransfer.controller";
import { createStockTransferSchema } from "./stockTransfer.validation";

const router = Router();

router.get("/", StockTransferController.getAll);
router.post(
    "/",
    validateRequest(createStockTransferSchema),
    StockTransferController.create,
);

export const StockTransferRoutes = router;
