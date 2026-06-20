import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { ReturnStatus } from "../../../generated/prisma";
import { StatusCodes } from "http-status-codes";
import { toMongoDeleteResult, toMongoDoc, toMongoDocs, toMongoUpdateResult } from "../../utils/mongoCompat";
import { decimalToNumber } from "../../utils/retailFormatters";
import { restockAtLocation } from "../../utils/inventoryWarehouse";
import { IReturnPayload } from "./return.interface";

const includeItems = { items: true } as const;

const formatReturn = (record: {
    id: string;
    returnNumber: string | null;
    invoiceNo: string;
    customerName: string | null;
    customerPhone: string | null;
    reason: string;
    notes: string | null;
    status: string;
    totalAmount: { toNumber?: () => number } | number;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
        id: string;
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: { toNumber?: () => number } | number;
    }>;
}) => ({
    ...toMongoDoc(record),
    returnId: record.returnNumber || record.id,
    totalAmount: decimalToNumber(record.totalAmount),
    items: record.items.map((item) => ({
        ...item,
        unitPrice: decimalToNumber(item.unitPrice),
    })),
});

const getAll = async () => {
    const returns = await prisma.return.findMany({
        include: includeItems,
        orderBy: { createdAt: "desc" },
    });
    return returns.map(formatReturn);
};

const create = async (payload: IReturnPayload) => {
    const sale = await prisma.sale.findUnique({
        where: { invoiceNo: payload.invoiceNo },
        include: { items: true },
    });
    if (!sale) throw new AppError(StatusCodes.NOT_FOUND, "Invoice not found");

    for (const item of payload.items) {
        const saleItem = sale.items.find((si) => si.productId === item.productId);
        if (!saleItem) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                `Product ${item.productName} is not on invoice ${payload.invoiceNo}`,
            );
        }

        const availableForReturn = Math.max(0, saleItem.quantity - (saleItem.returnedQuantity || 0));
        if (item.quantity > availableForReturn) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                `Return quantity for ${item.productName} exceeds available amount. Available: ${availableForReturn}, Requested: ${item.quantity}`,
            );
        }
    }

    const totalAmount = payload.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
    );

    const created = await prisma.return.create({
        data: {
            returnNumber: `RET-${Date.now()}`,
            saleId: sale.id,
            invoiceNo: payload.invoiceNo,
            customerName: payload.customerName ?? sale.customerName,
            customerPhone: payload.customerPhone ?? sale.customerPhone,
            reason: payload.reason,
            notes: payload.notes ?? null,
            totalAmount,
            items: {
                create: payload.items.map((item) => {
                    const saleItem = sale.items.find((si) => si.productId === item.productId);
                    return {
                        productId: item.productId,
                        productName: item.productName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        saleItemId: saleItem?.id ?? null,
                    };
                }),
            },
        },
        include: includeItems,
    });

    return formatReturn(created);
};

const approve = async (id: string) => {
    const record = await prisma.return.findUnique({
        where: { id },
        include: includeItems,
    });
    if (!record) throw new AppError(StatusCodes.NOT_FOUND, "Return not found");
    if (record.status === ReturnStatus.Approved) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Return already approved");
    }

    await prisma.$transaction(async (tx) => {
        for (const item of record.items) {
            await restockAtLocation(
                tx,
                item.productId,
                item.productName,
                item.quantity,
            );

            if (item.saleItemId) {
                const saleItem = await tx.saleItem.findUnique({ where: { id: item.saleItemId } });
                if (saleItem) {
                    await tx.saleItem.update({
                        where: { id: item.saleItemId },
                        data: {
                            returnedQuantity: saleItem.returnedQuantity + item.quantity,
                        },
                    });
                }
            }
        }

        await tx.return.update({
            where: { id },
            data: { status: ReturnStatus.Approved, approvedAt: new Date() },
        });
    });

    return { message: "Return approved successfully", result: toMongoUpdateResult() };
};

const reject = async (id: string) => {
    const record = await prisma.return.findUnique({ where: { id } });
    if (!record) throw new AppError(StatusCodes.NOT_FOUND, "Return not found");
    await prisma.return.update({
        where: { id },
        data: { status: ReturnStatus.Rejected, rejectedAt: new Date() },
    });
    return { message: "Return rejected successfully", result: toMongoUpdateResult() };
};

const remove = async (id: string) => {
    const record = await prisma.return.findUnique({ where: { id } });
    if (!record) throw new AppError(StatusCodes.NOT_FOUND, "Return not found");
    if (record.status === ReturnStatus.Approved) {
        throw new AppError(StatusCodes.BAD_REQUEST, "Cannot delete approved return");
    }
    await prisma.return.delete({ where: { id } });
    return toMongoDeleteResult();
};

export const ReturnService = { getAll, create, approve, reject, remove };
