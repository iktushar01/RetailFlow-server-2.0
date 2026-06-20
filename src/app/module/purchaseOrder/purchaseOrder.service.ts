import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { PurchaseOrderStatus } from "../../../generated/prisma";
import { StatusCodes } from "http-status-codes";
import {
    toMongoDeleteResult,
    toMongoUpdateResult,
} from "../../utils/mongoCompat";
import { fromClientPoStatus } from "../../utils/retailFormatters";
import { formatPoForClient } from "../grn/grn.helpers";
import {
    IPurchaseOrderPayload,
    IPurchaseOrderUpdatePayload,
} from "./purchaseOrder.interface";

const poInclude = { items: true } as const;

const parseDate = (value?: string | Date | null) => {
    if (!value) return null;
    return value instanceof Date ? value : new Date(value);
};

const mapItems = (items: IPurchaseOrderPayload["items"]) =>
    items.map((item) => {
        const productId = item.productId || item.product;
        if (!productId) {
            throw new AppError(StatusCodes.BAD_REQUEST, "Each item must include a product id");
        }
        const subtotal = item.subtotal ?? item.quantity * item.unitPrice;
        return {
            productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal,
        };
    });

const getAll = async (status?: string) => {
    const orders = await prisma.purchaseOrder.findMany({
        where: status ? { status: fromClientPoStatus(status) } : undefined,
        include: poInclude,
        orderBy: { createdAt: "desc" },
    });
    return orders.map(formatPoForClient);
};

const getById = async (id: string) => {
    const order = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: poInclude,
    });
    if (!order) {
        throw new AppError(StatusCodes.NOT_FOUND, "Purchase Order not found");
    }
    return formatPoForClient(order);
};

const create = async (payload: IPurchaseOrderPayload) => {
    const items = mapItems(payload.items);
    const subtotal = payload.subtotal ?? items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = payload.tax ?? 0;
    const taxAmount = payload.taxAmount ?? (subtotal * tax) / 100;
    const total = payload.total ?? subtotal + taxAmount;

    const order = await prisma.purchaseOrder.create({
        data: {
            poNumber: payload.poNumber,
            supplierId: payload.supplier,
            poDate: parseDate(payload.poDate)!,
            expectedDeliveryDate: parseDate(payload.expectedDeliveryDate),
            status: payload.status ? fromClientPoStatus(payload.status) : PurchaseOrderStatus.Draft,
            notes: payload.notes ?? null,
            tax,
            subtotal,
            taxAmount,
            total,
            items: { create: items },
        },
        include: poInclude,
    });

    return formatPoForClient(order);
};

const update = async (id: string, payload: IPurchaseOrderUpdatePayload) => {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "Purchase Order not found");
    }

    await prisma.$transaction(async (tx) => {
        const items = payload.items ? mapItems(payload.items) : null;
        const subtotal =
            payload.subtotal ??
            (items ? items.reduce((sum, item) => sum + item.subtotal, 0) : undefined);
        const tax = payload.tax;
        const taxAmount =
            payload.taxAmount ??
            (subtotal !== undefined && tax !== undefined
                ? (subtotal * tax) / 100
                : undefined);
        const total =
            payload.total ??
            (subtotal !== undefined && taxAmount !== undefined
                ? subtotal + taxAmount
                : undefined);

        await tx.purchaseOrder.update({
            where: { id },
            data: {
                ...(payload.poNumber ? { poNumber: payload.poNumber } : {}),
                ...(payload.supplier ? { supplierId: payload.supplier } : {}),
                ...(payload.poDate ? { poDate: parseDate(payload.poDate)! } : {}),
                ...(payload.expectedDeliveryDate !== undefined
                    ? { expectedDeliveryDate: parseDate(payload.expectedDeliveryDate) }
                    : {}),
                ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
                ...(payload.status ? { status: fromClientPoStatus(payload.status) } : {}),
                ...(tax !== undefined ? { tax } : {}),
                ...(subtotal !== undefined ? { subtotal } : {}),
                ...(taxAmount !== undefined ? { taxAmount } : {}),
                ...(total !== undefined ? { total } : {}),
            },
        });

        if (items) {
            await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
            await tx.purchaseOrderItem.createMany({
                data: items.map((item) => ({
                    purchaseOrderId: id,
                    ...item,
                })),
            });
        }
    });

    return toMongoUpdateResult();
};

const remove = async (id: string) => {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "Purchase Order not found");
    }

    await prisma.purchaseOrder.delete({ where: { id } });
    return toMongoDeleteResult();
};

const send = async (id: string) => {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "Purchase Order not found");
    }

    await prisma.purchaseOrder.update({
        where: { id },
        data: { status: PurchaseOrderStatus.Sent },
    });

    return {
        message: "PO sent to supplier",
        result: toMongoUpdateResult(),
    };
};

const updateStatus = async (id: string, status: string) => {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "Purchase Order not found");
    }

    await prisma.purchaseOrder.update({
        where: { id },
        data: { status: fromClientPoStatus(status) },
    });

    return {
        message: "PO status updated successfully",
        result: toMongoUpdateResult(),
    };
};

export const PurchaseOrderService = {
    getAll,
    getById,
    create,
    update,
    remove,
    send,
    updateStatus,
};
