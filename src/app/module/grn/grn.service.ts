import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { GrnStatus, PurchaseOrderStatus, SupplierPaymentStatus } from "../../../generated/prisma";
import { StatusCodes } from "http-status-codes";
import { toMongoUpdateResult } from "../../utils/mongoCompat";
import {
    buildCumulativeReceivedMap,
    buildCumulativeReceivedSummary,
    calculatePaymentDue,
    decimalToNumber,
    resolvePoStatus,
} from "../../utils/retailFormatters";
import { formatGrnForClient } from "./grn.helpers";
import { IGrnPayload, IGrnUpdatePayload } from "./grn.interface";
import { toClientPoStatus } from "../../utils/retailFormatters";

const grnInclude = {
    items: true,
} as const;

const parseDate = (value?: string | Date | null) => {
    if (!value) return null;
    return value instanceof Date ? value : new Date(value);
};

const getAll = async () => {
    const grns = await prisma.grn.findMany({
        include: grnInclude,
        orderBy: { createdAt: "desc" },
    });
    return grns.map(formatGrnForClient);
};

const getById = async (id: string) => {
    const grn = await prisma.grn.findUnique({
        where: { id },
        include: grnInclude,
    });
    if (!grn) {
        throw new AppError(StatusCodes.NOT_FOUND, "GRN not found");
    }
    return formatGrnForClient(grn);
};

const getCumulativeReceivedByPo = async (poId: string) => {
    const grns = await prisma.grn.findMany({
        where: { poId },
        include: { items: true },
    });
    return buildCumulativeReceivedSummary(grns);
};

const upsertInventoryForReceipt = async (
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    item: IGrnPayload["items"][number],
    destinationWarehouse: string,
) => {
    if (item.receivedQty <= 0) return;

    const existingInventory = await tx.inventory.findFirst({
        where: { productId: item.productId },
    });

    if (existingInventory) {
        await tx.inventory.update({
            where: { id: existingInventory.id },
            data: {
                stockQty: existingInventory.stockQty + item.receivedQty,
                ...(item.batch ? { batch: item.batch } : {}),
                ...(item.expiry ? { expiry: parseDate(item.expiry) } : {}),
            },
        });
        return;
    }

    await tx.inventory.create({
        data: {
            productId: item.productId,
            productName: item.productName,
            stockQty: item.receivedQty,
            batch: item.batch ?? null,
            expiry: parseDate(item.expiry),
            location: destinationWarehouse,
        },
    });
};

const revertInventoryForReceipt = async (
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    item: { productId: string; receivedQty: number },
) => {
    if (item.receivedQty <= 0) return;

    const existingInventory = await tx.inventory.findFirst({
        where: { productId: item.productId },
    });

    if (!existingInventory) return;

    const newStockQty = Math.max(0, existingInventory.stockQty - item.receivedQty);
    if (newStockQty === 0) {
        await tx.inventory.delete({ where: { id: existingInventory.id } });
        return;
    }

    await tx.inventory.update({
        where: { id: existingInventory.id },
        data: { stockQty: newStockQty },
    });
};

const syncPoAndPayment = async (
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    poId: string,
    grnId: string | null,
    grnMeta: { supplierId: string; poNumber?: string; grnNumber?: string },
    fallbackStatus: PurchaseOrderStatus = PurchaseOrderStatus.Sent,
) => {
    const po = await tx.purchaseOrder.findUnique({
        where: { id: poId },
        include: { items: true },
    });
    if (!po) return null;

    const grns = await tx.grn.findMany({
        where: { poId },
        include: { items: true },
    });

    const cumulativeReceived = buildCumulativeReceivedMap(grns);
    const newPOStatus = resolvePoStatus(
        po.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
        })),
        cumulativeReceived,
        fallbackStatus,
    );

    await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
            status: newPOStatus,
            ...(grnId ? { lastGrnDate: new Date() } : {}),
        },
    });

    const existingPayment = await tx.supplierPayment.findFirst({ where: { poId } });

    if (
        newPOStatus === PurchaseOrderStatus.FullyReceived ||
        newPOStatus === PurchaseOrderStatus.PartiallyReceived
    ) {
        const finalAmount = calculatePaymentDue(
            po.items,
            cumulativeReceived,
            decimalToNumber(po.tax),
        );

        if (!existingPayment) {
            await tx.supplierPayment.create({
                data: {
                    poId,
                    grnId,
                    supplierId: grnMeta.supplierId,
                    poNumber: grnMeta.poNumber ?? po.poNumber,
                    grnNumber: grnMeta.grnNumber ?? null,
                    amountDue: finalAmount,
                    amountPaid: 0,
                    status: SupplierPaymentStatus.Due,
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
            });
        } else {
            await tx.supplierPayment.update({
                where: { id: existingPayment.id },
                data: {
                    amountDue: finalAmount,
                    ...(grnId ? { grnId } : {}),
                },
            });
        }
    } else if (existingPayment) {
        await tx.supplierPayment.delete({ where: { id: existingPayment.id } });
    }

    return newPOStatus;
};

const create = async (payload: IGrnPayload) => {
    if (
        !payload.poId ||
        !payload.receivedDate ||
        !payload.destinationWarehouse ||
        !payload.items?.length
    ) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Missing required fields");
    }

    const po = await prisma.purchaseOrder.findUnique({
        where: { id: payload.poId },
        include: { items: true },
    });

    if (!po) {
        throw new AppError(StatusCodes.NOT_FOUND, "Purchase Order not found");
    }

    const existingGRNs = await prisma.grn.findMany({
        where: { poId: payload.poId },
        include: { items: true },
    });

    const cumulativeReceived = buildCumulativeReceivedMap(existingGRNs);

    for (const item of payload.items) {
        if (item.receivedQty > 0) {
            const poItem = po.items.find((pi) => pi.productId === item.productId);
            if (!poItem) {
                throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    `Product ${item.productName} not found in Purchase Order`,
                );
            }

            const orderedQty = poItem.quantity;
            const alreadyReceived = cumulativeReceived[item.productId] || 0;
            const remainingQty = orderedQty - alreadyReceived;

            if (item.receivedQty > remainingQty) {
                throw new AppError(
                    StatusCodes.BAD_REQUEST,
                    `Cannot receive ${item.receivedQty} of ${item.productName}. Only ${remainingQty} remaining to receive (Ordered: ${orderedQty}, Already received: ${alreadyReceived})`,
                );
            }
        }
    }

    const result = await prisma.$transaction(async (tx) => {
        const grn = await tx.grn.create({
            data: {
                grnNumber: payload.grnNumber,
                poId: payload.poId,
                poNumber: payload.poNumber ?? po.poNumber,
                supplierId: payload.supplierId,
                receivedDate: parseDate(payload.receivedDate)!,
                destinationWarehouseName: payload.destinationWarehouse,
                status:
                    payload.status === "Approved"
                        ? GrnStatus.Approved
                        : GrnStatus.Pending,
                notes: payload.notes ?? null,
                items: {
                    create: payload.items.map((item) => ({
                        productId: item.productId,
                        productName: item.productName,
                        orderedQty: item.orderedQty ?? 0,
                        receivedQty: item.receivedQty ?? 0,
                        batch: item.batch ?? null,
                        expiry: parseDate(item.expiry),
                        unitPrice: item.unitPrice ?? 0,
                    })),
                },
            },
            include: grnInclude,
        });

        for (const item of payload.items) {
            await upsertInventoryForReceipt(tx, item, payload.destinationWarehouse);
            cumulativeReceived[item.productId] =
                (cumulativeReceived[item.productId] || 0) + (item.receivedQty || 0);
        }

        const poStatus = await syncPoAndPayment(tx, payload.poId, grn.id, {
            supplierId: payload.supplierId,
            poNumber: payload.poNumber ?? po.poNumber,
            grnNumber: payload.grnNumber,
        });

        return { grn, poStatus };
    });

    return {
        message: "GRN created successfully. Inventory and PO updated.",
        result: { acknowledged: true, insertedId: result.grn.id },
        grnId: result.grn.id,
        poStatus: result.poStatus ? toClientPoStatus(result.poStatus) : undefined,
    };
};

const update = async (id: string, payload: IGrnUpdatePayload) => {
    const existing = await prisma.grn.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "GRN not found");
    }

    const { _id, items, destinationWarehouse, receivedDate, status, ...rest } = payload;

    await prisma.$transaction(async (tx) => {
        await tx.grn.update({
            where: { id },
            data: {
                ...rest,
                ...(destinationWarehouse
                    ? { destinationWarehouseName: destinationWarehouse }
                    : {}),
                ...(receivedDate ? { receivedDate: parseDate(receivedDate)! } : {}),
                ...(status
                    ? {
                          status:
                              status === "Approved" ? GrnStatus.Approved : GrnStatus.Pending,
                      }
                    : {}),
            },
        });

        if (items?.length) {
            await tx.grnItem.deleteMany({ where: { grnId: id } });
            await tx.grnItem.createMany({
                data: items.map((item) => ({
                    grnId: id,
                    productId: item.productId,
                    productName: item.productName,
                    orderedQty: item.orderedQty ?? 0,
                    receivedQty: item.receivedQty ?? 0,
                    batch: item.batch ?? null,
                    expiry: parseDate(item.expiry),
                    unitPrice: item.unitPrice ?? 0,
                })),
            });
        }
    });

    return { message: "GRN updated successfully", result: toMongoUpdateResult() };
};

const remove = async (id: string) => {
    const grn = await prisma.grn.findUnique({
        where: { id },
        include: { items: true },
    });

    if (!grn) {
        throw new AppError(StatusCodes.NOT_FOUND, "GRN not found");
    }

    if (grn.status === GrnStatus.Approved) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "Cannot delete approved GRN. Please contact administrator.",
        );
    }

    await prisma.$transaction(async (tx) => {
        for (const item of grn.items) {
            await revertInventoryForReceipt(tx, item);
        }

        await tx.grn.delete({ where: { id } });

        await syncPoAndPayment(
            tx,
            grn.poId,
            null,
            {
                supplierId: grn.supplierId,
                poNumber: grn.poNumber ?? undefined,
                grnNumber: grn.grnNumber,
            },
            PurchaseOrderStatus.Sent,
        );
    });

    return {
        message: "GRN deleted successfully. Inventory and PO status reverted.",
    };
};

const approve = async (id: string) => {
    const existing = await prisma.grn.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "GRN not found");
    }

    await prisma.grn.update({
        where: { id },
        data: {
            status: GrnStatus.Approved,
            approvedAt: new Date(),
        },
    });

    return { message: "GRN approved successfully", result: toMongoUpdateResult() };
};

export const GrnService = {
    getAll,
    getById,
    getCumulativeReceivedByPo,
    create,
    update,
    remove,
    approve,
};
