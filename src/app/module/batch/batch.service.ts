import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { StatusCodes } from "http-status-codes";
import { toMongoDeleteResult, toMongoDoc, toMongoDocs, toMongoUpdateResult } from "../../utils/mongoCompat";
import { IBatchPayload, IBatchUpdatePayload } from "./batch.interface";

const parseDate = (value?: string | Date | null) => {
    if (!value) return null;
    return value instanceof Date ? value : new Date(value);
};

const getAll = async () => {
    const batches = await prisma.batch.findMany({ orderBy: { createdAt: "desc" } });
    return toMongoDocs(batches);
};

const create = async (payload: IBatchPayload) => {
    const existing = await prisma.batch.findFirst({
        where: {
            productId: payload.productId,
            batchNumber: payload.batchNumber,
        },
    });

    if (existing) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Batch already exists");
    }

    const batch = await prisma.batch.create({
        data: {
            productId: payload.productId,
            batchNumber: payload.batchNumber,
            quantity: payload.quantity ?? 0,
            expiry: parseDate(payload.expiry),
            manufacturingDate: parseDate(payload.manufacturingDate),
            notes: payload.notes ?? null,
        },
    });

    return { message: "Batch created successfully", result: toMongoDoc(batch) };
};

const update = async (id: string, payload: IBatchUpdatePayload) => {
    const existing = await prisma.batch.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "Batch not found");
    }

    await prisma.batch.update({
        where: { id },
        data: {
            ...(payload.productId ? { productId: payload.productId } : {}),
            ...(payload.batchNumber ? { batchNumber: payload.batchNumber } : {}),
            ...(payload.quantity !== undefined ? { quantity: payload.quantity } : {}),
            ...(payload.expiry !== undefined ? { expiry: parseDate(payload.expiry) } : {}),
            ...(payload.manufacturingDate !== undefined
                ? { manufacturingDate: parseDate(payload.manufacturingDate) }
                : {}),
            ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        },
    });

    return { message: "Batch updated successfully", result: toMongoUpdateResult() };
};

const remove = async (id: string) => {
    const existing = await prisma.batch.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "Batch not found");
    }

    await prisma.batch.delete({ where: { id } });
    return { message: "Batch deleted successfully", result: toMongoDeleteResult() };
};

export const BatchService = {
    getAll,
    create,
    update,
    remove,
};
