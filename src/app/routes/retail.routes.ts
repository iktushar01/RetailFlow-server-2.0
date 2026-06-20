import express from "express";
import { ProductRoutes } from "../module/product/product.route";
import { SupplierRoutes } from "../module/supplier/supplier.route";
// Phase 3: import and mount remaining retail modules
// import { PurchaseOrderRoutes } from "../module/purchaseOrder/purchaseOrder.route";
// import { GrnRoutes } from "../module/grn/grn.route";
// import { InventoryRoutes } from "../module/inventory/inventory.route";
// import { PaymentRoutes } from "../module/payment/payment.route";
// import { WarehouseRoutes } from "../module/warehouse/warehouse.route";
// import { BatchRoutes } from "../module/batch/batch.route";
// import { StockTransferRoutes } from "../module/stockTransfer/stockTransfer.route";

const router = express.Router();

router.use("/suppliers", SupplierRoutes);
router.use("/products", ProductRoutes);

export const RetailRoute = router;
