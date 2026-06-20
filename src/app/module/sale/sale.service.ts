import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import {
    SalePaymentStatus,
    SaleStatus,
} from "../../../generated/prisma";
import { StatusCodes } from "http-status-codes";
import { toMongoDeleteResult } from "../../utils/mongoCompat";
import { decimalToNumber } from "../../utils/retailFormatters";
import { formatSaleForClient, formatSalesForClient } from "./sale.helpers";
import { ISalePayload, ISaleQuery } from "./sale.interface";

const saleInclude = { items: true } as const;

const mapPaymentStatus = (value?: string): SalePaymentStatus => {
    if (value === "Paid") return SalePaymentStatus.Paid;
    if (value === "Partial") return SalePaymentStatus.Partial;
    return SalePaymentStatus.Due;
};

const mapSaleStatus = (value?: string, isHold = false): SaleStatus => {
    if (isHold || value === "Hold") return SaleStatus.Hold;
    if (value === "Cancelled") return SaleStatus.Cancelled;
    return SaleStatus.Completed;
};

const deductInventory = async (
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    productId: string,
    quantity: number,
) => {
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

    if (remaining > 0) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            `Insufficient stock for product ${productId}. Short by ${remaining}`,
        );
    }
};

const restockInventory = async (
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    productId: string,
    productName: string,
    quantity: number,
) => {
    const existing = await tx.inventory.findFirst({ where: { productId } });
    if (existing) {
        await tx.inventory.update({
            where: { id: existing.id },
            data: { stockQty: existing.stockQty + quantity },
        });
        return;
    }

    await tx.inventory.create({
        data: {
            productId,
            productName,
            stockQty: quantity,
            location: "Main Warehouse",
        },
    });
};

const createSaleRecord = async (payload: ISalePayload, isHold: boolean) => {
    const status = mapSaleStatus(payload.status, isHold);
    const paymentStatus = mapPaymentStatus(payload.paymentStatus);

    return prisma.$transaction(async (tx) => {
        if (status === SaleStatus.Completed) {
            for (const item of payload.items) {
                const totalStock = await tx.inventory.aggregate({
                    where: { productId: item.productId },
                    _sum: { stockQty: true },
                });
                const available = totalStock._sum.stockQty || 0;
                if (available < item.quantity) {
                    throw new AppError(
                        StatusCodes.BAD_REQUEST,
                        `Insufficient stock for ${item.productName}. Available: ${available}, Requested: ${item.quantity}`,
                    );
                }
            }
        }

        const sale = await tx.sale.create({
            data: {
                invoiceNo: payload.invoiceNo,
                customerId: payload.customerId ?? null,
                customerName: payload.customerName,
                customerPhone: payload.customerPhone ?? null,
                subtotal: payload.subtotal,
                totalDiscount: payload.totalDiscount ?? 0,
                tax: payload.tax ?? 0,
                grandTotal: payload.grandTotal,
                paymentMethod: payload.paymentMethod ?? null,
                paymentStatus,
                amountPaid: payload.amountPaid ?? 0,
                status,
                notes: payload.notes ?? null,
                items: {
                    create: payload.items.map((item) => ({
                        productId: item.productId,
                        productName: item.productName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discount: item.discount ?? 0,
                        discountType: item.discountType ?? "flat",
                        subtotal: item.subtotal ?? item.unitPrice * item.quantity,
                    })),
                },
            },
            include: saleInclude,
        });

        if (status === SaleStatus.Completed) {
            for (const item of payload.items) {
                await deductInventory(tx, item.productId, item.quantity);
            }
        }

        if (paymentStatus === SalePaymentStatus.Paid) {
            await tx.salesPayment.create({
                data: {
                    saleId: sale.id,
                    invoiceNo: sale.invoiceNo,
                    customerId: sale.customerId,
                    customerName: sale.customerName,
                    amount: payload.amountPaid ?? payload.grandTotal,
                    paymentMethod: payload.paymentMethod ?? "Cash",
                    status: SalePaymentStatus.Paid,
                    paidAt: new Date(),
                },
            });
        }

        return sale;
    });
};

const getAll = async (query: ISaleQuery = {}) => {
    const where = query.status ? { status: mapSaleStatus(query.status) } : undefined;
    let sales = await prisma.sale.findMany({
        where,
        include: saleInclude,
        orderBy: { createdAt: "desc" },
    });

    if (query.limit) {
        sales = sales.slice(0, query.limit);
    }

    return formatSalesForClient(sales);
};

const getById = async (id: string) => {
    const sale = await prisma.sale.findUnique({ where: { id }, include: saleInclude });
    if (!sale) throw new AppError(StatusCodes.NOT_FOUND, "Sale not found");
    return formatSaleForClient(sale);
};

const getByInvoiceNo = async (invoiceNo: string) => {
    const sale = await prisma.sale.findUnique({
        where: { invoiceNo },
        include: saleInclude,
    });
    if (!sale) throw new AppError(StatusCodes.NOT_FOUND, "Sale not found");
    return formatSaleForClient(sale);
};

const create = async (payload: ISalePayload) => {
    const sale = await createSaleRecord(payload, false);
    return formatSaleForClient(sale);
};

const hold = async (payload: ISalePayload) => {
    const sale = await createSaleRecord(payload, true);
    return formatSaleForClient(sale);
};

const remove = async (id: string) => {
    const sale = await prisma.sale.findUnique({ where: { id }, include: saleInclude });
    if (!sale) throw new AppError(StatusCodes.NOT_FOUND, "Sale not found");

    await prisma.$transaction(async (tx) => {
        if (sale.status === SaleStatus.Completed) {
            for (const item of sale.items) {
                await restockInventory(tx, item.productId, item.productName, item.quantity);
            }
        }
        await tx.sale.delete({ where: { id } });
    });

    return toMongoDeleteResult();
};

const update = async (id: string, payload: Partial<ISalePayload>) => {
    const existing = await prisma.sale.findUnique({ where: { id }, include: saleInclude });
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Sale not found");

    const sale = await prisma.sale.update({
        where: { id },
        data: {
            ...(payload.customerId !== undefined ? { customerId: payload.customerId } : {}),
            ...(payload.customerName ? { customerName: payload.customerName } : {}),
            ...(payload.customerPhone !== undefined ? { customerPhone: payload.customerPhone } : {}),
            ...(payload.subtotal !== undefined ? { subtotal: payload.subtotal } : {}),
            ...(payload.totalDiscount !== undefined ? { totalDiscount: payload.totalDiscount } : {}),
            ...(payload.tax !== undefined ? { tax: payload.tax } : {}),
            ...(payload.grandTotal !== undefined ? { grandTotal: payload.grandTotal } : {}),
            ...(payload.paymentMethod !== undefined ? { paymentMethod: payload.paymentMethod } : {}),
            ...(payload.paymentStatus
                ? { paymentStatus: mapPaymentStatus(payload.paymentStatus) }
                : {}),
            ...(payload.amountPaid !== undefined ? { amountPaid: payload.amountPaid } : {}),
            ...(payload.status ? { status: mapSaleStatus(payload.status) } : {}),
            ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        },
        include: saleInclude,
    });

    return formatSaleForClient(sale);
};

const getAnalytics = async (period = "week") => {
    const sales = await prisma.sale.findMany({
        where: { status: SaleStatus.Completed },
        orderBy: { createdAt: "asc" },
    });

    const buckets: Record<string, number> = {};
    sales.forEach((sale) => {
        const key = new Date(sale.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
        buckets[key] = (buckets[key] || 0) + decimalToNumber(sale.grandTotal);
    });

    return {
        labels: Object.keys(buckets),
        data: Object.values(buckets),
        period,
    };
};

const getSummary = async (dateFrom?: string, dateTo?: string) => {
    const sales = await prisma.sale.findMany({
        where: {
            status: SaleStatus.Completed,
            ...(dateFrom || dateTo
                ? {
                      createdAt: {
                          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                          ...(dateTo ? { lte: new Date(dateTo) } : {}),
                      },
                  }
                : {}),
        },
        include: saleInclude,
    });

    const totalAmount = sales.reduce(
        (sum, sale) => sum + decimalToNumber(sale.grandTotal),
        0,
    );

    return {
        totalSales: sales.length,
        totalAmount,
        totalProfit: 0, // TODO: compute from costPrice when COGS tracking is added
        averageOrderValue: sales.length ? totalAmount / sales.length : 0,
        topProducts: [],
        salesTrend: [],
    };
};

const getTopProducts = async (limit = 5) => {
    const items = await prisma.saleItem.groupBy({
        by: ["productId", "productName"],
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: limit,
    });

    return items.map((item) => ({
        productId: item.productId,
        name: item.productName,
        productName: item.productName,
        quantitySold: item._sum.quantity || 0,
        revenue: decimalToNumber(item._sum.subtotal),
    }));
};

const getByDateRange = async (dateFrom: string, dateTo: string) => {
    const sales = await prisma.sale.findMany({
        where: {
            createdAt: {
                gte: new Date(dateFrom),
                lte: new Date(dateTo),
            },
        },
        include: saleInclude,
        orderBy: { createdAt: "desc" },
    });
    return formatSalesForClient(sales);
};

const exportData = async () => {
    const sales = await getAll();
    return {
        format: "csv",
        rows: sales,
        // TODO: stream CSV file download
    };
};

export const SaleService = {
    getAll,
    getById,
    getByInvoiceNo,
    create,
    hold,
    update,
    remove,
    getAnalytics,
    getSummary,
    getTopProducts,
    getByDateRange,
    exportData,
};
