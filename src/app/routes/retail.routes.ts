import express from "express";
import { ProductRoutes } from "../module/product/product.route";
import { SupplierRoutes } from "../module/supplier/supplier.route";
import { PurchaseOrderRoutes } from "../module/purchaseOrder/purchaseOrder.route";
import { GrnRoutes } from "../module/grn/grn.route";
import { InventoryRoutes } from "../module/inventory/inventory.route";
import { PaymentRoutes } from "../module/payment/payment.route";
import { WarehouseRoutes } from "../module/warehouse/warehouse.route";
import { StockTransferRoutes } from "../module/stockTransfer/stockTransfer.route";

const router = express.Router();

router.use("/suppliers/payments", PaymentRoutes);
router.use("/suppliers", SupplierRoutes);
router.use("/products", ProductRoutes);
router.use("/purchase-orders", PurchaseOrderRoutes);
router.use("/grn", GrnRoutes);
router.use("/inventory", InventoryRoutes);
router.use("/payments", PaymentRoutes);
router.use("/warehouses", WarehouseRoutes);
router.use("/stock-transfers", StockTransferRoutes);

export const RetailRoute = router;
