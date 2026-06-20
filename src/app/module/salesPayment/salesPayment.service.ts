import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { SalePaymentStatus } from "../../../generated/prisma";
import { StatusCodes } from "http-status-codes";
import { toMongoDeleteResult, toMongoDoc, toMongoDocs, toMongoUpdateResult } from "../../utils/mongoCompat";
import { decimalToNumber } from "../../utils/retailFormatters";
import { ISalesPaymentPayload, ISalesPaymentUpdatePayload } from "./salesPayment.interface";

const mapStatus = (status?: string) => {
    if (status === "Due") return SalePaymentStatus.Due;
    if (status === "Partial") return SalePaymentStatus.Partial;
    return SalePaymentStatus.Paid;
};

const resolveSalePaymentStatus = (totalPaid: number, grandTotal: number): SalePaymentStatus => {
    if (totalPaid >= grandTotal) return SalePaymentStatus.Paid;
    if (totalPaid > 0) return SalePaymentStatus.Partial;
    return SalePaymentStatus.Due;
};

const syncSaleFromPayments = async (
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
    saleId: string | null,
    invoiceNo: string,
) => {
    let resolvedSaleId = saleId;
    if (!resolvedSaleId) {
        const sale = await tx.sale.findUnique({ where: { invoiceNo } });
        resolvedSaleId = sale?.id ?? null;
    }
    if (!resolvedSaleId) return;

    const sale = await tx.sale.findUnique({ where: { id: resolvedSaleId } });
    if (!sale) return;

    const payments = await tx.salesPayment.findMany({ where: { saleId: resolvedSaleId } });
    const totalPaid = payments.reduce((sum, payment) => sum + decimalToNumber(payment.amount), 0);
    const grandTotal = decimalToNumber(sale.grandTotal);

    await tx.sale.update({
        where: { id: resolvedSaleId },
        data: {
            amountPaid: totalPaid,
            paymentStatus: resolveSalePaymentStatus(totalPaid, grandTotal),
        },
    });
};

const getAll = async () =>
    toMongoDocs(await prisma.salesPayment.findMany({ orderBy: { createdAt: "desc" } }));

const getById = async (id: string) => {
    const payment = await prisma.salesPayment.findUnique({ where: { id } });
    if (!payment) throw new AppError(StatusCodes.NOT_FOUND, "Payment not found");
    return toMongoDoc(payment);
};

const getByInvoiceNo = async (invoiceNo: string) => {
    const payment = await prisma.salesPayment.findFirst({
        where: { invoiceNo },
        orderBy: { createdAt: "desc" },
    });
    if (!payment) throw new AppError(StatusCodes.NOT_FOUND, "Payment not found");
    return toMongoDoc(payment);
};

const create = async (payload: ISalesPaymentPayload) => {
    const payment = await prisma.$transaction(async (tx) => {
        let saleId = payload.saleId ?? null;
        if (!saleId) {
            const sale = await tx.sale.findUnique({ where: { invoiceNo: payload.invoiceNo } });
            saleId = sale?.id ?? null;
        }

        const created = await tx.salesPayment.create({
            data: {
                saleId,
                invoiceNo: payload.invoiceNo,
                customerId: payload.customerId ?? null,
                customerName: payload.customerName ?? null,
                amount: payload.amount,
                paymentMethod: payload.paymentMethod ?? null,
                status: mapStatus(payload.status),
                paidAt: mapStatus(payload.status) === SalePaymentStatus.Paid ? new Date() : null,
                notes: payload.notes ?? null,
            },
        });

        await syncSaleFromPayments(tx, saleId, payload.invoiceNo);
        return created;
    });

    return toMongoDoc(payment);
};

const update = async (id: string, payload: ISalesPaymentUpdatePayload) => {
    const existing = await prisma.salesPayment.findUnique({ where: { id } });
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Payment not found");

    await prisma.$transaction(async (tx) => {
        await tx.salesPayment.update({
            where: { id },
            data: {
                ...(payload.amount !== undefined ? { amount: payload.amount } : {}),
                ...(payload.paymentMethod !== undefined ? { paymentMethod: payload.paymentMethod } : {}),
                ...(payload.status
                    ? { status: mapStatus(payload.status), paidAt: new Date() }
                    : {}),
                ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
            },
        });

        await syncSaleFromPayments(tx, existing.saleId, existing.invoiceNo);
    });

    return toMongoUpdateResult();
};

const remove = async (id: string) => {
    const existing = await prisma.salesPayment.findUnique({ where: { id } });
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Payment not found");

    await prisma.$transaction(async (tx) => {
        await tx.salesPayment.delete({ where: { id } });
        await syncSaleFromPayments(tx, existing.saleId, existing.invoiceNo);
    });

    return toMongoDeleteResult();
};

export const SalesPaymentService = {
    getAll,
    getById,
    getByInvoiceNo,
    create,
    update,
    remove,
};
