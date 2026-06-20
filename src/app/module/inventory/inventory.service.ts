import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { StatusCodes } from "http-status-codes";
import {
    toMongoDeleteResult,
    toMongoDocs,
    toMongoUpdateResult,
} from "../../utils/mongoCompat";
import {
    buildProductCentricInventory,
    formatInventoryRecord,
} from "./inventory.helpers";
import {
    IInventoryBarcodePayload,
    IInventoryPayload,
    IInventoryStockPayload,
    IInventoryUpdatePayload,
} from "./inventory.interface";

const parseDate = (value?: string | Date | null) => {
    if (!value) return null;
    return value instanceof Date ? value : new Date(value);
};

const getAll = async () => {
    const rows = await prisma.inventory.findMany({ orderBy: { updatedAt: "desc" } });
    return toMongoDocs(rows);
};

const getProducts = async () => {
    const [products, inventoryRows] = await Promise.all([
        prisma.product.findMany(),
        prisma.inventory.findMany(),
    ]);
    return buildProductCentricInventory(products, inventoryRows);
};

const getLowStock = async (threshold: number) => {
    const productView = await getProducts();
    return productView.filter((item) => (item.stockQty || 0) < threshold);
};

const getById = async (id: string) => {
    const row = await prisma.inventory.findUnique({ where: { id } });
    if (!row) throw new AppError(StatusCodes.NOT_FOUND, "Inventory item not found");
    return formatInventoryRecord(row);
};

const getByProductId = async (productId: string) => {
    const row = await prisma.inventory.findFirst({ where: { productId } });
    if (!row) throw new AppError(StatusCodes.NOT_FOUND, "Product not found in inventory");
    return formatInventoryRecord(row);
};

const create = async (payload: IInventoryPayload) => {
    const row = await prisma.inventory.create({
        data: {
            productId: payload.productId,
            productName: payload.productName ?? null,
            stockQty: payload.stockQty ?? 0,
            location: payload.location ?? null,
            batch: payload.batch ?? null,
            expiry: parseDate(payload.expiry),
            barcode: payload.barcode ?? null,
            qrCode: payload.qrCode ?? null,
        },
    });
    return formatInventoryRecord(row);
};

const update = async (id: string, payload: IInventoryUpdatePayload) => {
    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Inventory item not found");

    await prisma.inventory.update({
        where: { id },
        data: {
            ...(payload.productId ? { productId: payload.productId } : {}),
            ...(payload.productName !== undefined ? { productName: payload.productName } : {}),
            ...(payload.stockQty !== undefined ? { stockQty: payload.stockQty } : {}),
            ...(payload.location !== undefined ? { location: payload.location } : {}),
            ...(payload.batch !== undefined ? { batch: payload.batch } : {}),
            ...(payload.expiry !== undefined ? { expiry: parseDate(payload.expiry) } : {}),
            ...(payload.barcode !== undefined ? { barcode: payload.barcode } : {}),
            ...(payload.qrCode !== undefined ? { qrCode: payload.qrCode } : {}),
        },
    });
    return toMongoUpdateResult();
};

const updateStock = async (id: string, payload: IInventoryStockPayload) => {
    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Inventory item not found");
    const stockQty = payload.stockQty ?? payload.quantity;
    if (stockQty === undefined) {
        throw new AppError(StatusCodes.BAD_REQUEST, "stockQty is required");
    }
    await prisma.inventory.update({ where: { id }, data: { stockQty } });
    return toMongoUpdateResult();
};

const remove = async (id: string) => {
    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Inventory item not found");
    await prisma.inventory.delete({ where: { id } });
    return toMongoDeleteResult();
};

const updateBarcode = async (id: string, payload: IInventoryBarcodePayload) => {
    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Inventory item not found");

    if (payload.barcode) {
        const duplicate = await prisma.inventory.findFirst({
            where: { barcode: payload.barcode, NOT: { id } },
        });
        if (duplicate) throw new AppError(StatusCodes.BAD_REQUEST, "Barcode already exists");
    }

    await prisma.inventory.update({
        where: { id },
        data: {
            ...(payload.barcode ? { barcode: payload.barcode } : {}),
            ...(payload.qrCode ? { qrCode: payload.qrCode } : {}),
        },
    });

    return { message: "Barcode updated successfully", result: toMongoUpdateResult() };
};

export const InventoryService = {
    getAll,
    getProducts,
    getLowStock,
    getById,
    getByProductId,
    create,
    update,
    updateStock,
    remove,
    updateBarcode,
};
