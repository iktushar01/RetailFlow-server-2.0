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
import { restockAtLocation } from "../../utils/inventoryWarehouse";

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
    await tx.$executeRaw`
        SELECT id FROM inventory
        WHERE "productId" = ${productId} AND "stockQty" > 0
        FOR UPDATE
    `;

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
) => restockAtLocation(tx, productId, productName, quantity);

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

    const previousStatus = existing.status;
    const nextStatus = payload.status ? mapSaleStatus(payload.status) : previousStatus;

    const sale = await prisma.$transaction(async (tx) => {
        if (previousStatus !== nextStatus) {
            if (previousStatus === SaleStatus.Hold && nextStatus === SaleStatus.Completed) {
                for (const item of existing.items) {
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
                    await deductInventory(tx, item.productId, item.quantity);
                }
            } else if (
                previousStatus === SaleStatus.Completed &&
                (nextStatus === SaleStatus.Hold || nextStatus === SaleStatus.Cancelled)
            ) {
                for (const item of existing.items) {
                    await restockInventory(tx, item.productId, item.productName, item.quantity);
                }
            }
        }

        return tx.sale.update({
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
                ...(payload.status ? { status: nextStatus } : {}),
                ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
            },
            include: saleInclude,
        });
    });

    return formatSaleForClient(sale);
};

const getPeriodBounds = (period: string): { start: Date; end: Date } => {
    const end = new Date();
    const start = new Date();

    switch (period.toLowerCase()) {
        case "today":
        case "day":
            start.setHours(0, 0, 0, 0);
            break;
        case "month":
            start.setDate(start.getDate() - 29);
            start.setHours(0, 0, 0, 0);
            break;
        case "week":
        default:
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            break;
    }

    return { start, end };
};

const getAnalytics = async (period = "week") => {
    const normalizedPeriod = period.toLowerCase();
    const { start, end } = getPeriodBounds(normalizedPeriod);

    const sales = await prisma.sale.findMany({
        where: {
            status: SaleStatus.Completed,
            createdAt: { gte: start, lte: end },
        },
        orderBy: { createdAt: "asc" },
    });

    if (normalizedPeriod === "today" || normalizedPeriod === "day") {
        const hourlyBuckets: Record<number, { revenue: number; salesCount: number }> = {};
        for (let hour = 0; hour < 24; hour++) {
            hourlyBuckets[hour] = { revenue: 0, salesCount: 0 };
        }

        sales.forEach((sale) => {
            const hour = new Date(sale.createdAt).getHours();
            hourlyBuckets[hour].revenue += decimalToNumber(sale.grandTotal);
            hourlyBuckets[hour].salesCount += 1;
        });

        const labels = Array.from({ length: 24 }, (_, hour) => `${hour}:00`);
        const revenue = labels.map((_, hour) => hourlyBuckets[hour].revenue);
        const salesCount = labels.map((_, hour) => hourlyBuckets[hour].salesCount);

        return { labels, data: revenue, revenue, salesCount, period: normalizedPeriod };
    }

    const dailyBuckets = new Map<string, { revenue: number; salesCount: number; sortKey: number }>();
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);

    while (cursor <= endDay) {
        const label = cursor.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dailyBuckets.set(label, { revenue: 0, salesCount: 0, sortKey: cursor.getTime() });
        cursor.setDate(cursor.getDate() + 1);
    }

    sales.forEach((sale) => {
        const saleDate = new Date(sale.createdAt);
        const label = saleDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const bucket = dailyBuckets.get(label);
        if (bucket) {
            bucket.revenue += decimalToNumber(sale.grandTotal);
            bucket.salesCount += 1;
        }
    });

    const sorted = [...dailyBuckets.entries()].sort((a, b) => a[1].sortKey - b[1].sortKey);
    const labels = sorted.map(([label]) => label);
    const revenue = sorted.map(([, bucket]) => bucket.revenue);
    const salesCount = sorted.map(([, bucket]) => bucket.salesCount);

    return { labels, data: revenue, revenue, salesCount, period: normalizedPeriod };
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

    const productIds = [...new Set(sales.flatMap((sale) => sale.items.map((item) => item.productId)))];
    const products = productIds.length
        ? await prisma.product.findMany({ where: { id: { in: productIds } } })
        : [];
    const costByProduct = new Map(
        products.map((product) => [product.id, decimalToNumber(product.costPrice)]),
    );

    let totalCOGS = 0;
    for (const sale of sales) {
        for (const item of sale.items) {
            const unitCost = costByProduct.get(item.productId) ?? 0;
            totalCOGS += unitCost * item.quantity;
        }
    }

    const totalProfit = totalAmount - totalCOGS;

    return {
        totalSales: sales.length,
        totalAmount,
        totalProfit,
        totalCOGS,
        averageOrderValue: sales.length ? totalAmount / sales.length : 0,
        topProducts: [],
        salesTrend: [],
    };
};

const getTopProducts = async (limit = 5, dateFrom?: string, dateTo?: string) => {
    const saleFilter: {
        status: SaleStatus;
        createdAt?: { gte?: Date; lte?: Date };
    } = { status: SaleStatus.Completed };

    if (dateFrom || dateTo) {
        saleFilter.createdAt = {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
        };
    }

    const items = await prisma.saleItem.groupBy({
        by: ["productId", "productName"],
        where: { sale: saleFilter },
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
    const sales = await prisma.sale.findMany({
        include: saleInclude,
        orderBy: { createdAt: "desc" },
    });

    const header = [
        "invoiceNo",
        "customerName",
        "status",
        "paymentStatus",
        "subtotal",
        "totalDiscount",
        "tax",
        "grandTotal",
        "amountPaid",
        "paymentMethod",
        "createdAt",
    ].join(",");

    const rows = sales.map((sale) =>
        [
            sale.invoiceNo,
            `"${sale.customerName.replace(/"/g, '""')}"`,
            sale.status,
            sale.paymentStatus,
            decimalToNumber(sale.subtotal),
            decimalToNumber(sale.totalDiscount),
            decimalToNumber(sale.tax),
            decimalToNumber(sale.grandTotal),
            decimalToNumber(sale.amountPaid),
            sale.paymentMethod ?? "",
            sale.createdAt.toISOString(),
        ].join(","),
    );

    return [header, ...rows].join("\n");
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
