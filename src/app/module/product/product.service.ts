import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { StatusCodes } from "http-status-codes";
import {
    toMongoDeleteResult,
    toMongoDoc,
    toMongoDocs,
    toMongoUpdateResult,
} from "../../utils/mongoCompat";
import { decimalToNumber } from "../../utils/retailFormatters";
import {
    IProductPayload,
    IProductUpdatePayload,
} from "./product.interface";

const mapProductInput = (payload: IProductPayload | IProductUpdatePayload) => {
    const sellingPrice =
        payload.sellingPrice ?? payload.price ?? undefined;
    const costPrice = payload.costPrice ?? undefined;

    return {
        productName: payload.productName,
        category: payload.category,
        brand: payload.brand,
        sku: payload.sku,
        description: payload.description,
        qrCode: payload.qrCode,
        barcode: payload.barcode,
        supplierName: payload.supplier,
        supplierId: payload.supplierId ?? undefined,
        productImage: payload.productImage,
        costPrice,
        sellingPrice,
        reorderLevel: payload.reorderLevel,
        isActive: payload.isActive,
    };
};

const buildCreateData = (payload: IProductPayload) => {
    const mapped = mapProductInput(payload);
    return {
        productName: mapped.productName!,
        category: mapped.category!,
        brand: mapped.brand ?? null,
        sku: mapped.sku!,
        description: mapped.description ?? null,
        qrCode: mapped.qrCode ?? null,
        barcode: mapped.barcode ?? null,
        supplierName: mapped.supplierName ?? null,
        supplierId: mapped.supplierId ?? null,
        productImage: mapped.productImage ?? null,
        costPrice: mapped.costPrice ?? 0,
        sellingPrice: mapped.sellingPrice ?? 0,
        reorderLevel: mapped.reorderLevel ?? 10,
        isActive: mapped.isActive ?? true,
    };
};

const buildUpdateData = (payload: IProductUpdatePayload) => {
    const mapped = mapProductInput(payload);
    const data: Record<string, unknown> = {};

    Object.entries(mapped).forEach(([key, value]) => {
        if (value !== undefined) {
            data[key] = value;
        }
    });

    return data;
};

const getAll = async () => {
    const products = await prisma.product.findMany({
        orderBy: { createdAt: "desc" },
    });
    return toMongoDocs(products);
};

const getById = async (id: string) => {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
        throw new AppError(StatusCodes.NOT_FOUND, "Product not found");
    }
    return toMongoDoc(product);
};

const create = async (payload: IProductPayload) => {
    const product = await prisma.product.create({
        data: buildCreateData(payload),
    });
    return toMongoDoc(product);
};

const update = async (id: string, payload: IProductUpdatePayload) => {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "Product not found");
    }

    await prisma.product.update({
        where: { id },
        data: buildUpdateData(payload),
    });

    return toMongoUpdateResult();
};

const remove = async (id: string) => {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "Product not found");
    }

    await prisma.product.delete({ where: { id } });
    return toMongoDeleteResult();
};

const getByBarcode = async (barcode: string) => {
    const product = await prisma.product.findFirst({
        where: {
            OR: [{ barcode }, { qrCode: barcode }, { sku: barcode }],
        },
    });
    if (!product) {
        throw new AppError(StatusCodes.NOT_FOUND, "Product not found");
    }
    return toMongoDoc(product);
};

const updatePrice = async (id: string, sellingPrice: number) => {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "Product not found");
    }
    await prisma.product.update({ where: { id }, data: { sellingPrice } });
    return toMongoUpdateResult();
};

const getTopSelling = async (limit = 5) => {
    const items = await prisma.saleItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: limit,
    });

    const products = await prisma.product.findMany({
        where: { id: { in: items.map((item) => item.productId) } },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    return items.map((item) => {
        const product = productMap[item.productId];
        return {
            ...(product ? toMongoDoc(product) : { _id: item.productId }),
            quantitySold: item._sum.quantity || 0,
            revenue: decimalToNumber(item._sum.subtotal),
        };
    });
};

export const ProductService = {
    getAll,
    getById,
    getByBarcode,
    getTopSelling,
    create,
    update,
    updatePrice,
    remove,
};
