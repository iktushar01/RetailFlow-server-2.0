/**
 * One-time migration: MongoDB (RetailFlow-server) → PostgreSQL (Prisma).
 *
 * Usage:
 *   pnpm run migrate:data              # migrate (requires empty retail tables)
 *   pnpm run migrate:data -- --dry-run # preview Mongo counts only
 *
 * IMPORTANT:
 * - Run once on an empty PostgreSQL database (retail tables must have 0 rows).
 * - Does NOT delete or modify MongoDB data.
 * - Reads MONGODB_URI from ../RetailFlow-server/.env
 * - Reads DATABASE_URL from prisma-express-server-template/.env
 */
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";
import { PrismaPg } from "@prisma/adapter-pg";
import {
    GrnStatus,
    PrismaClient,
    PurchaseOrderStatus,
    StockTransferStatus,
    SupplierPaymentStatus,
} from "../src/generated/prisma/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_ROOT = path.resolve(__dirname, "..");
const MONGO_ENV_PATH = path.resolve(TEMPLATE_ROOT, "../RetailFlow-server/.env");
const MONGO_DB_NAME = "POS_System_DB";

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");

dotenv.config({ path: path.join(TEMPLATE_ROOT, ".env") });

type IdMap = Map<string, string>;

type MigrationFailure = {
    collection: string;
    mongoId: string;
    reason: string;
};

type MigrationStats = {
    collection: string;
    mongoCount: number;
    inserted: number;
    skipped: number;
    failed: number;
};

const failures: MigrationFailure[] = [];
const stats: MigrationStats[] = [];

const logFailure = (collection: string, mongoId: string, reason: string) => {
    failures.push({ collection, mongoId, reason });
};

const pushStat = (stat: MigrationStats) => {
    stats.push(stat);
};

const mongoIdOf = (doc: { _id?: unknown }): string | null => {
    if (!doc._id) return null;
    return typeof doc._id === "string" ? doc._id : String(doc._id);
};

const toDate = (value: unknown): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toNumber = (value: unknown, fallback = 0): number => {
    if (value === null || value === undefined) return fallback;
    const n = Number(value);
    return Number.isNaN(n) ? fallback : n;
};

const newId = (): string => crypto.randomUUID().replace(/-/g, "").slice(0, 24);

const fromClientPoStatus = (status: unknown): PurchaseOrderStatus => {
    const map: Record<string, PurchaseOrderStatus> = {
        Draft: PurchaseOrderStatus.Draft,
        Sent: PurchaseOrderStatus.Sent,
        "Partially Received": PurchaseOrderStatus.PartiallyReceived,
        PartiallyReceived: PurchaseOrderStatus.PartiallyReceived,
        "Fully Received": PurchaseOrderStatus.FullyReceived,
        FullyReceived: PurchaseOrderStatus.FullyReceived,
        Cancelled: PurchaseOrderStatus.Cancelled,
    };
    return map[String(status ?? "Draft")] ?? PurchaseOrderStatus.Draft;
};

const fromClientGrnStatus = (status: unknown): GrnStatus => {
    const value = String(status ?? "Pending");
    return value === "Approved" ? GrnStatus.Approved : GrnStatus.Pending;
};

const fromClientPaymentStatus = (status: unknown): SupplierPaymentStatus => {
    const value = String(status ?? "Due");
    if (value === "Paid") return SupplierPaymentStatus.Paid;
    if (value === "Partial") return SupplierPaymentStatus.Partial;
    return SupplierPaymentStatus.Due;
};

const fromClientTransferStatus = (status: unknown): StockTransferStatus => {
    const value = String(status ?? "Completed");
    if (value === "Pending") return StockTransferStatus.Pending;
    if (value === "Cancelled") return StockTransferStatus.Cancelled;
    return StockTransferStatus.Completed;
};

const loadEnv = () => {
    if (!fs.existsSync(MONGO_ENV_PATH)) {
        throw new Error(`RetailFlow-server .env not found at ${MONGO_ENV_PATH}`);
    }

    const mongoEnv = dotenv.parse(fs.readFileSync(MONGO_ENV_PATH));
    const mongodbUri = mongoEnv.MONGODB_URI;
    const databaseUrl = process.env.DATABASE_URL;

    if (!mongodbUri) {
        throw new Error("MONGODB_URI is missing in RetailFlow-server/.env");
    }
    if (!databaseUrl) {
        throw new Error("DATABASE_URL is missing in prisma-express-server-template/.env");
    }

    return { mongodbUri, databaseUrl };
};

const createPrisma = (databaseUrl: string) => {
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    return new PrismaClient({ adapter });
};

const assertEmptyTargetDb = async (prisma: PrismaClient) => {
    const counts = await Promise.all([
        prisma.supplier.count(),
        prisma.product.count(),
        prisma.warehouse.count(),
        prisma.purchaseOrder.count(),
        prisma.purchaseOrderItem.count(),
        prisma.grn.count(),
        prisma.grnItem.count(),
        prisma.inventory.count(),
        prisma.batch.count(),
        prisma.supplierPayment.count(),
        prisma.stockTransfer.count(),
    ]);

    const total = counts.reduce((sum, n) => sum + n, 0);
    if (total > 0) {
        throw new Error(
            "Target PostgreSQL database is not empty. " +
                "This script must run once on a fresh retail schema. " +
                `Found ${total} existing retail rows.`,
        );
    }
};

const migrateSuppliers = async (
    docs: Record<string, unknown>[],
    maps: { suppliers: IdMap },
    prisma: PrismaClient,
) => {
    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    const rows = docs.flatMap((doc) => {
        const mongoId = mongoIdOf(doc as { _id?: unknown });
        if (!mongoId) {
            failed += 1;
            logFailure("suppliers", "unknown", "Missing _id");
            return [];
        }

        const prismaId = newId();
        maps.suppliers.set(mongoId, prismaId);
        inserted += 1;

        return {
            id: prismaId,
            supplierName: String(doc.supplierName ?? "Unknown Supplier"),
            contactPerson: String(doc.contactPerson ?? ""),
            email: String(doc.email ?? "unknown@example.com"),
            phone: String(doc.phone ?? ""),
            address: String(doc.address ?? ""),
            notes: doc.notes ? String(doc.notes) : null,
            status: String(doc.status ?? "Active"),
            createdAt: toDate(doc.createdAt) ?? new Date(),
            updatedAt: toDate(doc.updatedAt) ?? new Date(),
        };
    });

    if (rows.length) {
        await prisma.supplier.createMany({ data: rows });
    }

    pushStat({
        collection: "suppliers",
        mongoCount: docs.length,
        inserted,
        skipped,
        failed,
    });
};

const migrateProducts = async (
    docs: Record<string, unknown>[],
    maps: { suppliers: IdMap; products: IdMap },
    prisma: PrismaClient,
) => {
    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    const usedSkus = new Set<string>();
    const usedBarcodes = new Set<string>();
    const usedQrCodes = new Set<string>();

    const rows = docs.flatMap((doc, index) => {
        const mongoId = mongoIdOf(doc as { _id?: unknown });
        if (!mongoId) {
            failed += 1;
            logFailure("products", "unknown", "Missing _id");
            return [];
        }

        const rawSupplierId = doc.supplierId ?? doc.supplier;
        const supplierId =
            rawSupplierId && maps.suppliers.has(String(rawSupplierId))
                ? maps.suppliers.get(String(rawSupplierId))!
                : null;

        if (rawSupplierId && !supplierId) {
            logFailure("products", mongoId, `Unknown supplierId ${String(rawSupplierId)}`);
        }

        let sku = String(doc.sku ?? "").trim();
        if (!sku) sku = `SKU-MIG-${mongoId.slice(-8)}`;
        while (usedSkus.has(sku)) {
            sku = `${sku}-${index}`;
        }
        usedSkus.add(sku);

        let barcode = doc.barcode ? String(doc.barcode).trim() : null;
        if (barcode) {
            if (usedBarcodes.has(barcode)) barcode = `${barcode}-${mongoId.slice(-4)}`;
            usedBarcodes.add(barcode);
        }

        let qrCode = doc.qrCode ? String(doc.qrCode).trim() : null;
        if (qrCode) {
            if (usedQrCodes.has(qrCode)) qrCode = `${qrCode}-${mongoId.slice(-4)}`;
            usedQrCodes.add(qrCode);
        }

        const prismaId = newId();
        maps.products.set(mongoId, prismaId);
        inserted += 1;

        return {
            id: prismaId,
            productName: String(doc.productName ?? "Unknown Product"),
            category: String(doc.category ?? "General"),
            brand: doc.brand ? String(doc.brand) : null,
            sku,
            description: doc.description ? String(doc.description) : null,
            qrCode,
            barcode,
            supplierName: doc.supplierName ? String(doc.supplierName) : null,
            supplierId,
            productImage: doc.productImage ? String(doc.productImage) : null,
            costPrice: toNumber(doc.costPrice),
            sellingPrice: toNumber(doc.sellingPrice ?? doc.price),
            reorderLevel: toNumber(doc.reorderLevel, 10),
            isActive: doc.isActive !== false,
            createdAt: toDate(doc.createdAt) ?? new Date(),
            updatedAt: toDate(doc.updatedAt) ?? new Date(),
        };
    });

    if (rows.length) {
        await prisma.product.createMany({ data: rows, skipDuplicates: true });
    }

    pushStat({
        collection: "products",
        mongoCount: docs.length,
        inserted,
        skipped,
        failed,
    });
};

const migrateWarehouses = async (
    docs: Record<string, unknown>[],
    maps: { warehouses: IdMap; warehouseByName: IdMap },
    prisma: PrismaClient,
) => {
    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    const rows = docs.flatMap((doc) => {
        const mongoId = mongoIdOf(doc as { _id?: unknown });
        if (!mongoId) {
            failed += 1;
            logFailure("warehouses", "unknown", "Missing _id");
            return [];
        }

        const name = String(doc.name ?? `Warehouse-${mongoId.slice(-6)}`);
        const prismaId = newId();
        maps.warehouses.set(mongoId, prismaId);
        maps.warehouseByName.set(name, prismaId);
        inserted += 1;

        return {
            id: prismaId,
            name,
            location: doc.location ? String(doc.location) : null,
            address: doc.address ? String(doc.address) : null,
            capacity: doc.capacity !== undefined ? toNumber(doc.capacity) : null,
            isActive: doc.isActive !== false,
            createdAt: toDate(doc.createdAt) ?? new Date(),
            updatedAt: toDate(doc.updatedAt) ?? new Date(),
        };
    });

    if (rows.length) {
        await prisma.warehouse.createMany({ data: rows, skipDuplicates: true });
    }

    pushStat({
        collection: "warehouses",
        mongoCount: docs.length,
        inserted,
        skipped,
        failed,
    });
};

const migratePurchaseOrders = async (
    docs: Record<string, unknown>[],
    maps: { suppliers: IdMap; products: IdMap; purchaseOrders: IdMap },
    prisma: PrismaClient,
) => {
    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    let mongoItemCount = 0;
    let insertedItemCount = 0;

    for (const doc of docs) {
        const mongoId = mongoIdOf(doc as { _id?: unknown });
        if (!mongoId) {
            failed += 1;
            logFailure("purchaseOrders", "unknown", "Missing _id");
            continue;
        }

        const rawSupplierId = doc.supplierId ?? doc.supplier;
        const supplierId = rawSupplierId
            ? maps.suppliers.get(String(rawSupplierId))
            : undefined;

        if (!supplierId) {
            failed += 1;
            logFailure("purchaseOrders", mongoId, "Missing or unmapped supplierId");
            continue;
        }

        const items = Array.isArray(doc.items) ? doc.items : [];
        mongoItemCount += items.length;

        const mappedItems = items.flatMap((item: Record<string, unknown>) => {
            const rawProductId = item.productId ?? item.product;
            const productId = rawProductId
                ? maps.products.get(String(rawProductId))
                : undefined;

            if (!productId) {
                logFailure(
                    "purchaseOrderItems",
                    mongoId,
                    `Unmapped product ${String(rawProductId)} on PO ${String(doc.poNumber ?? mongoId)}`,
                );
                return [];
            }

            const quantity = toNumber(item.quantity ?? item.orderedQty, 0);
            const unitPrice = toNumber(item.unitPrice);
            const subtotal = toNumber(item.subtotal, quantity * unitPrice);

            insertedItemCount += 1;
            return {
                productId,
                productName: String(item.productName ?? "Unknown"),
                quantity,
                unitPrice,
                subtotal,
            };
        });

        if (!mappedItems.length && items.length > 0) {
            failed += 1;
            continue;
        }

        const prismaId = newId();
        maps.purchaseOrders.set(mongoId, prismaId);

        try {
            await prisma.purchaseOrder.create({
                data: {
                    id: prismaId,
                    poNumber: String(doc.poNumber ?? `PO-MIG-${mongoId.slice(-6)}`),
                    supplierId,
                    poDate: toDate(doc.poDate) ?? new Date(),
                    expectedDeliveryDate: toDate(doc.expectedDeliveryDate),
                    status: fromClientPoStatus(doc.status),
                    notes: doc.notes ? String(doc.notes) : null,
                    tax: toNumber(doc.tax),
                    subtotal: toNumber(doc.subtotal),
                    taxAmount: toNumber(doc.taxAmount),
                    total: toNumber(doc.total),
                    lastGrnDate: toDate(doc.lastGRNDate ?? doc.lastGrnDate),
                    createdAt: toDate(doc.createdAt) ?? new Date(),
                    updatedAt: toDate(doc.updatedAt) ?? new Date(),
                    items: mappedItems.length ? { create: mappedItems } : undefined,
                },
            });
            inserted += 1;
        } catch (error) {
            failed += 1;
            maps.purchaseOrders.delete(mongoId);
            logFailure(
                "purchaseOrders",
                mongoId,
                error instanceof Error ? error.message : String(error),
            );
        }
    }

    pushStat({
        collection: "purchaseOrders",
        mongoCount: docs.length,
        inserted,
        skipped,
        failed,
    });
    pushStat({
        collection: "purchaseOrderItems",
        mongoCount: mongoItemCount,
        inserted: insertedItemCount,
        skipped: 0,
        failed: mongoItemCount - insertedItemCount,
    });
};

const migrateGrn = async (
    docs: Record<string, unknown>[],
    maps: {
        suppliers: IdMap;
        products: IdMap;
        purchaseOrders: IdMap;
        grn: IdMap;
        warehouseByName: IdMap;
    },
    prisma: PrismaClient,
) => {
    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    let mongoItemCount = 0;
    let insertedItemCount = 0;

    for (const doc of docs) {
        const mongoId = mongoIdOf(doc as { _id?: unknown });
        if (!mongoId) {
            failed += 1;
            logFailure("grn", "unknown", "Missing _id");
            continue;
        }

        const poId = maps.purchaseOrders.get(String(doc.poId));
        if (!poId) {
            failed += 1;
            logFailure("grn", mongoId, `Unmapped poId ${String(doc.poId)}`);
            continue;
        }

        const rawSupplierId = doc.supplierId;
        const supplierId = rawSupplierId
            ? maps.suppliers.get(String(rawSupplierId))
            : undefined;
        if (!supplierId) {
            failed += 1;
            logFailure("grn", mongoId, `Unmapped supplierId ${String(rawSupplierId)}`);
            continue;
        }

        const destinationName = doc.destinationWarehouse
            ? String(doc.destinationWarehouse)
            : null;
        const destinationWarehouseId = destinationName
            ? maps.warehouseByName.get(destinationName) ?? null
            : null;

        const items = Array.isArray(doc.items) ? doc.items : [];
        mongoItemCount += items.length;

        const mappedItems = items.flatMap((item: Record<string, unknown>) => {
            const productId = maps.products.get(String(item.productId));
            if (!productId) {
                logFailure(
                    "grnItems",
                    mongoId,
                    `Unmapped productId ${String(item.productId)}`,
                );
                return [];
            }

            insertedItemCount += 1;
            return {
                productId,
                productName: String(item.productName ?? "Unknown"),
                orderedQty: toNumber(item.orderedQty),
                receivedQty: toNumber(item.receivedQty),
                batch: item.batch ? String(item.batch) : null,
                expiry: toDate(item.expiry),
                unitPrice: toNumber(item.unitPrice),
            };
        });

        const prismaId = newId();
        maps.grn.set(mongoId, prismaId);

        try {
            await prisma.grn.create({
                data: {
                    id: prismaId,
                    grnNumber: String(doc.grnNumber ?? `GRN-MIG-${mongoId.slice(-6)}`),
                    poId,
                    poNumber: doc.poNumber ? String(doc.poNumber) : null,
                    supplierId,
                    receivedDate: toDate(doc.receivedDate) ?? new Date(),
                    destinationWarehouseId,
                    destinationWarehouseName: destinationName,
                    status: fromClientGrnStatus(doc.status),
                    notes: doc.notes ? String(doc.notes) : null,
                    approvedAt: toDate(doc.approvedAt),
                    createdAt: toDate(doc.createdAt) ?? new Date(),
                    updatedAt: toDate(doc.updatedAt) ?? new Date(),
                    items: mappedItems.length ? { create: mappedItems } : undefined,
                },
            });
            inserted += 1;
        } catch (error) {
            failed += 1;
            maps.grn.delete(mongoId);
            logFailure("grn", mongoId, error instanceof Error ? error.message : String(error));
        }
    }

    pushStat({ collection: "grn", mongoCount: docs.length, inserted, skipped, failed });
    pushStat({
        collection: "grnItems",
        mongoCount: mongoItemCount,
        inserted: insertedItemCount,
        skipped: 0,
        failed: mongoItemCount - insertedItemCount,
    });
};

const migrateInventory = async (
    docs: Record<string, unknown>[],
    maps: { products: IdMap; warehouseByName: IdMap; inventory: IdMap },
    prisma: PrismaClient,
) => {
    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    const rows = docs.flatMap((doc) => {
        const mongoId = mongoIdOf(doc as { _id?: unknown });
        if (!mongoId) {
            failed += 1;
            logFailure("inventory", "unknown", "Missing _id");
            return [];
        }

        const productId = maps.products.get(String(doc.productId));
        if (!productId) {
            failed += 1;
            logFailure("inventory", mongoId, `Unmapped productId ${String(doc.productId)}`);
            return [];
        }

        const location = doc.location ? String(doc.location) : null;
        const warehouseId = location ? maps.warehouseByName.get(location) ?? null : null;

        const prismaId = newId();
        maps.inventory.set(mongoId, prismaId);
        inserted += 1;

        return {
            id: prismaId,
            productId,
            warehouseId,
            location,
            productName: doc.productName ? String(doc.productName) : null,
            stockQty: toNumber(doc.stockQty),
            batch: doc.batch ? String(doc.batch) : null,
            expiry: toDate(doc.expiry),
            barcode: doc.barcode ? String(doc.barcode) : null,
            qrCode: doc.qrCode ? String(doc.qrCode) : null,
            createdAt: toDate(doc.createdAt) ?? new Date(),
            updatedAt: toDate(doc.updatedAt) ?? new Date(),
        };
    });

    if (rows.length) {
        await prisma.inventory.createMany({ data: rows, skipDuplicates: true });
    }

    pushStat({
        collection: "inventory",
        mongoCount: docs.length,
        inserted,
        skipped,
        failed,
    });
};

const migrateBatches = async (
    docs: Record<string, unknown>[],
    maps: { products: IdMap; batches: IdMap },
    prisma: PrismaClient,
) => {
    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    const rows = docs.flatMap((doc) => {
        const mongoId = mongoIdOf(doc as { _id?: unknown });
        if (!mongoId) {
            failed += 1;
            logFailure("batches", "unknown", "Missing _id");
            return [];
        }

        const productId = maps.products.get(String(doc.productId));
        if (!productId) {
            failed += 1;
            logFailure("batches", mongoId, `Unmapped productId ${String(doc.productId)}`);
            return [];
        }

        const prismaId = newId();
        maps.batches.set(mongoId, prismaId);
        inserted += 1;

        return {
            id: prismaId,
            productId,
            batchNumber: String(doc.batchNumber ?? `BATCH-${mongoId.slice(-6)}`),
            quantity: toNumber(doc.quantity),
            expiry: toDate(doc.expiry),
            manufacturingDate: toDate(doc.manufacturingDate),
            notes: doc.notes ? String(doc.notes) : null,
            createdAt: toDate(doc.createdAt) ?? new Date(),
            updatedAt: toDate(doc.updatedAt) ?? new Date(),
        };
    });

    if (rows.length) {
        await prisma.batch.createMany({ data: rows, skipDuplicates: true });
    }

    pushStat({ collection: "batches", mongoCount: docs.length, inserted, skipped, failed });
};

const migratePayments = async (
    docs: Record<string, unknown>[],
    maps: {
        purchaseOrders: IdMap;
        grn: IdMap;
        suppliers: IdMap;
        payments: IdMap;
    },
    prisma: PrismaClient,
) => {
    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    const rows = docs.flatMap((doc) => {
        const mongoId = mongoIdOf(doc as { _id?: unknown });
        if (!mongoId) {
            failed += 1;
            logFailure("payments", "unknown", "Missing _id");
            return [];
        }

        const poId = maps.purchaseOrders.get(String(doc.poId));
        if (!poId) {
            failed += 1;
            logFailure("payments", mongoId, `Unmapped poId ${String(doc.poId)}`);
            return [];
        }

        const supplierId = maps.suppliers.get(String(doc.supplierId));
        if (!supplierId) {
            failed += 1;
            logFailure("payments", mongoId, `Unmapped supplierId ${String(doc.supplierId)}`);
            return [];
        }

        const grnId = doc.grnId ? maps.grn.get(String(doc.grnId)) ?? null : null;

        const prismaId = newId();
        maps.payments.set(mongoId, prismaId);
        inserted += 1;

        return {
            id: prismaId,
            poId,
            grnId,
            supplierId,
            poNumber: doc.poNumber ? String(doc.poNumber) : null,
            grnNumber: doc.grnNumber ? String(doc.grnNumber) : null,
            amountDue: toNumber(doc.amountDue),
            amountPaid: toNumber(doc.amountPaid),
            status: fromClientPaymentStatus(doc.status),
            dueDate: toDate(doc.dueDate),
            paidAt: toDate(doc.paidAt),
            createdAt: toDate(doc.createdAt) ?? new Date(),
            updatedAt: toDate(doc.updatedAt) ?? new Date(),
        };
    });

    if (rows.length) {
        await prisma.supplierPayment.createMany({ data: rows, skipDuplicates: true });
    }

    pushStat({ collection: "payments", mongoCount: docs.length, inserted, skipped, failed });
};

const migrateStockTransfers = async (
    docs: Record<string, unknown>[],
    maps: { products: IdMap; warehouseByName: IdMap; stockTransfers: IdMap },
    prisma: PrismaClient,
) => {
    let inserted = 0;
    let skipped = 0;
    let failed = 0;

    const rows = docs.flatMap((doc) => {
        const mongoId = mongoIdOf(doc as { _id?: unknown });
        if (!mongoId) {
            failed += 1;
            logFailure("stockTransfers", "unknown", "Missing _id");
            return [];
        }

        const productId = maps.products.get(String(doc.productId));
        if (!productId) {
            failed += 1;
            logFailure(
                "stockTransfers",
                mongoId,
                `Unmapped productId ${String(doc.productId)}`,
            );
            return [];
        }

        const sourceName = String(
            doc.sourceWarehouse ?? doc.sourceWarehouseName ?? "Unknown Source",
        );
        const destinationName = String(
            doc.destinationWarehouse ?? doc.destinationWarehouseName ?? "Unknown Destination",
        );

        const prismaId = newId();
        maps.stockTransfers.set(mongoId, prismaId);
        inserted += 1;

        return {
            id: prismaId,
            productId,
            productName: String(doc.productName ?? "Unknown"),
            sourceWarehouseId: maps.warehouseByName.get(sourceName) ?? null,
            sourceWarehouseName: sourceName,
            destinationWarehouseId: maps.warehouseByName.get(destinationName) ?? null,
            destinationWarehouseName: destinationName,
            quantity: toNumber(doc.quantity),
            status: fromClientTransferStatus(doc.status),
            createdAt: toDate(doc.createdAt) ?? new Date(),
            updatedAt: toDate(doc.updatedAt) ?? new Date(),
        };
    });

    if (rows.length) {
        await prisma.stockTransfer.createMany({ data: rows, skipDuplicates: true });
    }

    pushStat({
        collection: "stockTransfers",
        mongoCount: docs.length,
        inserted,
        skipped,
        failed,
    });
};

const verifyCounts = async (
    mongoCounts: Record<string, number>,
    prisma: PrismaClient,
) => {
    const postgresCounts = {
        suppliers: await prisma.supplier.count(),
        products: await prisma.product.count(),
        warehouses: await prisma.warehouse.count(),
        purchaseOrders: await prisma.purchaseOrder.count(),
        purchaseOrderItems: await prisma.purchaseOrderItem.count(),
        grn: await prisma.grn.count(),
        grnItems: await prisma.grnItem.count(),
        inventory: await prisma.inventory.count(),
        batches: await prisma.batch.count(),
        payments: await prisma.supplierPayment.count(),
        stockTransfers: await prisma.stockTransfer.count(),
    };

    console.log("\n=== Count verification (Mongo vs PostgreSQL) ===");
    const keys = Object.keys(postgresCounts) as Array<keyof typeof postgresCounts>;
    let allMatch = true;

    for (const key of keys) {
        const mongo = mongoCounts[key] ?? 0;
        const postgres = postgresCounts[key];
        const match = mongo === postgres ? "OK" : "MISMATCH";
        if (match === "MISMATCH") allMatch = false;
        console.log(
            `${key.padEnd(22)} mongo=${String(mongo).padStart(5)} postgres=${String(postgres).padStart(5)} ${match}`,
        );
    }

    return allMatch;
};

const main = async () => {
    const { mongodbUri, databaseUrl } = loadEnv();
    const prisma = createPrisma(databaseUrl);
    const mongoClient = new MongoClient(mongodbUri);

    console.log("RetailFlow MongoDB → PostgreSQL migration");
    console.log(`Mongo env: ${MONGO_ENV_PATH}`);
    console.log(`Postgres: ${databaseUrl.replace(/:[^:@/]+@/, ":****@")}`);
    console.log(DRY_RUN ? "Mode: DRY RUN (no writes)" : "Mode: MIGRATE (empty DB required)\n");

    await mongoClient.connect();
    const db = mongoClient.db(MONGO_DB_NAME);

    const [
        suppliers,
        products,
        warehouses,
        purchaseOrders,
        grn,
        inventory,
        batches,
        payments,
        stockTransfers,
    ] = await Promise.all([
        db.collection("suppliers").find({}).toArray(),
        db.collection("products").find({}).toArray(),
        db.collection("warehouses").find({}).toArray(),
        db.collection("purchaseOrders").find({}).toArray(),
        db.collection("grn").find({}).toArray(),
        db.collection("inventory").find({}).toArray(),
        db.collection("batches").find({}).toArray(),
        db.collection("payments").find({}).toArray(),
        db.collection("stockTransfers").find({}).toArray(),
    ]);

    const poItemCount = purchaseOrders.reduce(
        (sum, doc) => sum + (Array.isArray(doc.items) ? doc.items.length : 0),
        0,
    );
    const grnItemCount = grn.reduce(
        (sum, doc) => sum + (Array.isArray(doc.items) ? doc.items.length : 0),
        0,
    );

    const mongoCounts: Record<string, number> = {
        suppliers: suppliers.length,
        products: products.length,
        warehouses: warehouses.length,
        purchaseOrders: purchaseOrders.length,
        purchaseOrderItems: poItemCount,
        grn: grn.length,
        grnItems: grnItemCount,
        inventory: inventory.length,
        batches: batches.length,
        payments: payments.length,
        stockTransfers: stockTransfers.length,
    };

    console.log("=== MongoDB source counts ===");
    Object.entries(mongoCounts).forEach(([key, count]) => {
        console.log(`${key.padEnd(22)} ${count}`);
    });

    if (DRY_RUN) {
        await mongoClient.close();
        await prisma.$disconnect();
        console.log("\nDry run complete. No data was written.");
        return;
    }

    await assertEmptyTargetDb(prisma);

    const maps = {
        suppliers: new Map<string, string>(),
        products: new Map<string, string>(),
        warehouses: new Map<string, string>(),
        warehouseByName: new Map<string, string>(),
        purchaseOrders: new Map<string, string>(),
        grn: new Map<string, string>(),
        inventory: new Map<string, string>(),
        batches: new Map<string, string>(),
        payments: new Map<string, string>(),
        stockTransfers: new Map<string, string>(),
    };

    console.log("\n=== Migrating in dependency order ===");
    await migrateSuppliers(suppliers, maps, prisma);
    await migrateProducts(products, maps, prisma);
    await migrateWarehouses(warehouses, maps, prisma);
    await migratePurchaseOrders(purchaseOrders, maps, prisma);
    await migrateGrn(grn, maps, prisma);
    await migrateInventory(inventory, maps, prisma);
    await migrateBatches(batches, maps, prisma);
    await migratePayments(payments, maps, prisma);
    await migrateStockTransfers(stockTransfers, maps, prisma);

    console.log("\n=== Migration stats ===");
    stats.forEach((s) => {
        console.log(
            `${s.collection.padEnd(22)} mongo=${s.mongoCount} inserted=${s.inserted} skipped=${s.skipped} failed=${s.failed}`,
        );
    });

    if (failures.length) {
        console.log(`\n=== Failures (${failures.length}) ===`);
        failures.slice(0, 50).forEach((f) => {
            console.log(`[${f.collection}] ${f.mongoId}: ${f.reason}`);
        });
        if (failures.length > 50) {
            console.log(`... and ${failures.length - 50} more`);
        }
    }

    const allMatch = await verifyCounts(mongoCounts, prisma);

    await mongoClient.close();
    await prisma.$disconnect();

    if (!allMatch || failures.length) {
        console.error(
            "\nMigration finished with mismatches or failures. Review logs above.",
        );
        process.exitCode = 1;
        return;
    }

    console.log("\nMigration completed successfully. MongoDB data was not modified.");
};

main().catch(async (error) => {
    if (error instanceof Error && error.message.includes("bad auth")) {
        console.error(
            "Migration failed: MongoDB authentication failed. " +
                "Update MONGODB_URI in RetailFlow-server/.env with valid Atlas credentials.",
        );
    } else {
        console.error("Migration failed:", error);
    }
    process.exit(1);
});
