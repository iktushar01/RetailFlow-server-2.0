import express from "express";
import { requireRetailAuth } from "../middleware/requireRetailAuth";
import { ProductRoutes } from "../module/product/product.route";
import { SupplierRoutes } from "../module/supplier/supplier.route";
import { PurchaseOrderRoutes } from "../module/purchaseOrder/purchaseOrder.route";
import { GrnRoutes } from "../module/grn/grn.route";
import { InventoryRoutes } from "../module/inventory/inventory.route";
import { PaymentRoutes } from "../module/payment/payment.route";
import { WarehouseRoutes } from "../module/warehouse/warehouse.route";
import { StockTransferRoutes } from "../module/stockTransfer/stockTransfer.route";
import { SaleRoutes } from "../module/sale/sale.route";
import { CustomerRoutes } from "../module/customer/customer.route";
import { DiscountRoutes } from "../module/discount/discount.route";
import { SalesPaymentRoutes } from "../module/salesPayment/salesPayment.route";
import { ReturnRoutes } from "../module/return/return.route";
import { BatchRoutes } from "../module/batch/batch.route";
import { UploadRoutes } from "../module/upload/upload.route";
import { AiRoutes } from "../module/ai/ai.route";

const router = express.Router();

router.use(requireRetailAuth);

router.use("/upload", UploadRoutes);
router.use("/ai", AiRoutes);

router.use("/suppliers/payments", PaymentRoutes);
router.use("/suppliers", SupplierRoutes);
router.use("/products", ProductRoutes);
router.use("/purchase-orders", PurchaseOrderRoutes);
router.use("/grn", GrnRoutes);
router.use("/inventory", InventoryRoutes);
router.use("/payments", PaymentRoutes);
router.use("/warehouses", WarehouseRoutes);
router.use("/stock-transfers", StockTransferRoutes);
router.use("/sales", SaleRoutes);
router.use("/customers", CustomerRoutes);
router.use("/discounts", DiscountRoutes);
router.use("/sales-payments", SalesPaymentRoutes);
router.use("/returns", ReturnRoutes);
router.use("/batches", BatchRoutes);

export const RetailRoute = router;
