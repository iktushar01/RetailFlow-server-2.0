import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { SalePaymentStatus } from "../../../generated/prisma";
import { StatusCodes } from "http-status-codes";
import { toMongoDeleteResult, toMongoDoc, toMongoDocs, toMongoUpdateResult } from "../../utils/mongoCompat";
import { ISalesPaymentPayload, ISalesPaymentUpdatePayload } from "./salesPayment.interface";

const mapStatus = (status?: string) => {
    if (status === "Due") return SalePaymentStatus.Due;
    if (status === "Partial") return SalePaymentStatus.Partial;
    return SalePaymentStatus.Paid;
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
    let saleId = payload.saleId ?? null;
    if (!saleId) {
        const sale = await prisma.sale.findUnique({ where: { invoiceNo: payload.invoiceNo } });
        saleId = sale?.id ?? null;
    }

    const payment = await prisma.salesPayment.create({
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
    return toMongoDoc(payment);
};

const update = async (id: string, payload: ISalesPaymentUpdatePayload) => {
    const existing = await prisma.salesPayment.findUnique({ where: { id } });
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Payment not found");

    await prisma.salesPayment.update({
        where: { id },
        data: {
            ...(payload.amount !== undefined ? { amount: payload.amount } : {}),
            ...(payload.paymentMethod !== undefined ? { paymentMethod: payload.paymentMethod } : {}),
            ...(payload.status ? { status: mapStatus(payload.status), paidAt: new Date() } : {}),
            ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        },
    });
    return toMongoUpdateResult();
};

const remove = async (id: string) => {
    const existing = await prisma.salesPayment.findUnique({ where: { id } });
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Payment not found");
    await prisma.salesPayment.delete({ where: { id } });
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
