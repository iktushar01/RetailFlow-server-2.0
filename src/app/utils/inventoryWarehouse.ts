import { prisma } from "../lib/prisma";

export const DEFAULT_WAREHOUSE_LOCATION = "Main Warehouse";

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export const findInventoryAtLocation = async (
    tx: Tx,
    productId: string,
    location: string,
) =>
    tx.inventory.findFirst({
        where: { productId, location },
    });

export const resolveWarehouseId = async (tx: Tx, location: string) => {
    const warehouse = await tx.warehouse.findFirst({ where: { name: location } });
    return warehouse?.id ?? null;
};

export const addStockAtLocation = async (
    tx: Tx,
    productId: string,
    productName: string,
    quantity: number,
    location: string = DEFAULT_WAREHOUSE_LOCATION,
    extras?: { batch?: string | null; expiry?: Date | null },
) => {
    if (quantity <= 0) return;

    const existing = await findInventoryAtLocation(tx, productId, location);
    if (existing) {
        await tx.inventory.update({
            where: { id: existing.id },
            data: {
                stockQty: existing.stockQty + quantity,
                ...(extras?.batch ? { batch: extras.batch } : {}),
                ...(extras?.expiry ? { expiry: extras.expiry } : {}),
            },
        });
        return;
    }

    const warehouseId = await resolveWarehouseId(tx, location);
    await tx.inventory.create({
        data: {
            productId,
            productName,
            stockQty: quantity,
            location,
            warehouseId,
            batch: extras?.batch ?? null,
            expiry: extras?.expiry ?? null,
        },
    });
};

export const removeStockAtLocation = async (
    tx: Tx,
    productId: string,
    quantity: number,
    location?: string,
) => {
    if (quantity <= 0) return;

    if (location) {
        const existing = await findInventoryAtLocation(tx, productId, location);
        if (!existing) return;

        const newStockQty = Math.max(0, existing.stockQty - quantity);
        if (newStockQty === 0) {
            await tx.inventory.delete({ where: { id: existing.id } });
        } else {
            await tx.inventory.update({
                where: { id: existing.id },
                data: { stockQty: newStockQty },
            });
        }
        return;
    }

    let remaining = quantity;
    const rows = await tx.inventory.findMany({
        where: { productId, stockQty: { gt: 0 } },
        orderBy: { updatedAt: "asc" },
    });

    for (const row of rows) {
        if (remaining <= 0) break;
        const deduct = Math.min(row.stockQty, remaining);
        const nextQty = row.stockQty - deduct;
        remaining -= deduct;

        if (nextQty === 0) {
            await tx.inventory.delete({ where: { id: row.id } });
        } else {
            await tx.inventory.update({
                where: { id: row.id },
                data: { stockQty: nextQty },
            });
        }
    }
};

export const restockAtLocation = async (
    tx: Tx,
    productId: string,
    productName: string,
    quantity: number,
    location: string = DEFAULT_WAREHOUSE_LOCATION,
) => addStockAtLocation(tx, productId, productName, quantity, location);
