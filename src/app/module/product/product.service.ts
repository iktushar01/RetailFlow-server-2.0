import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { StatusCodes } from "http-status-codes";
import {
    toMongoDeleteResult,
    toMongoDoc,
    toMongoDocs,
    toMongoUpdateResult,
} from "../../utils/mongoCompat";
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

export const ProductService = {
    getAll,
    getById,
    create,
    update,
    remove,
};
