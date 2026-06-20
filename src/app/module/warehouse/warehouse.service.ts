import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { StatusCodes } from "http-status-codes";
import {
    toMongoDeleteResult,
    toMongoDoc,
    toMongoUpdateResult,
} from "../../utils/mongoCompat";
import { IWarehousePayload } from "./warehouse.interface";

const getAll = async () => {
    const warehouses = await prisma.warehouse.findMany({
        orderBy: { createdAt: "desc" },
    });

    const warehousesWithSummary = await Promise.all(
        warehouses.map(async (warehouse) => {
            const inventoryItems = await prisma.inventory.findMany({
                where: { location: warehouse.name },
            });

            const doc = toMongoDoc(warehouse);
            return {
                ...doc,
                totalProducts: inventoryItems.length,
                totalStock: inventoryItems.reduce(
                    (sum, item) => sum + (item.stockQty || 0),
                    0,
                ),
            };
        }),
    );

    return warehousesWithSummary;
};

const create = async (payload: IWarehousePayload) => {
    const warehouse = await prisma.warehouse.create({
        data: {
            name: payload.name,
            location: payload.location ?? null,
            address: payload.address ?? null,
            capacity: payload.capacity ?? null,
            isActive: payload.isActive ?? true,
        },
    });

    return {
        message: "Warehouse created successfully",
        result: { acknowledged: true, insertedId: warehouse.id },
    };
};

const update = async (id: string, payload: Partial<IWarehousePayload>) => {
    const existing = await prisma.warehouse.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "Warehouse not found");
    }

    await prisma.warehouse.update({
        where: { id },
        data: {
            ...(payload.name ? { name: payload.name } : {}),
            ...(payload.location !== undefined ? { location: payload.location } : {}),
            ...(payload.address !== undefined ? { address: payload.address } : {}),
            ...(payload.capacity !== undefined ? { capacity: payload.capacity } : {}),
            ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        },
    });

    return {
        message: "Warehouse updated successfully",
        result: toMongoUpdateResult(),
    };
};

const remove = async (id: string) => {
    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) {
        throw new AppError(StatusCodes.NOT_FOUND, "Warehouse not found");
    }

    const inventoryCount = await prisma.inventory.count({
        where: { location: warehouse.name },
    });

    if (inventoryCount > 0) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Cannot delete warehouse with stock");
    }

    await prisma.warehouse.delete({ where: { id } });
    return { message: "Warehouse deleted successfully" };
};

export const WarehouseService = {
    getAll,
    create,
    update,
    remove,
};
