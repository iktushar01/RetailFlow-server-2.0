import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { SupplierPaymentStatus } from "../../../generated/prisma";
import { StatusCodes } from "http-status-codes";
import { toMongoDoc, toMongoDocs, toMongoUpdateResult } from "../../utils/mongoCompat";
import { ISupplierPaymentUpdatePayload } from "./payment.interface";

const parseDate = (value?: string | Date | null) => {
    if (!value) return null;
    return value instanceof Date ? value : new Date(value);
};

const getAll = async () => {
    const payments = await prisma.supplierPayment.findMany({
        orderBy: { createdAt: "desc" },
    });
    return toMongoDocs(payments);
};

const getById = async (id: string) => {
    const payment = await prisma.supplierPayment.findUnique({ where: { id } });
    if (!payment) {
        throw new AppError(StatusCodes.NOT_FOUND, "Payment not found");
    }
    return toMongoDoc(payment);
};

const update = async (id: string, payload: ISupplierPaymentUpdatePayload) => {
    const existing = await prisma.supplierPayment.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "Payment not found");
    }

    const amountDue =
        payload.amountDue !== undefined
            ? payload.amountDue
            : existing.amountDue.toNumber();
    const amountPaid =
        payload.amountPaid !== undefined
            ? payload.amountPaid
            : existing.amountPaid.toNumber();

    let status = payload.status as SupplierPaymentStatus | undefined;
    let paidAt = payload.paidAt !== undefined ? parseDate(payload.paidAt) : existing.paidAt;

    if (amountPaid >= amountDue) {
        status = SupplierPaymentStatus.Paid;
        paidAt = paidAt ?? new Date();
    } else if (amountPaid > 0) {
        status = SupplierPaymentStatus.Partial;
    }

    await prisma.supplierPayment.update({
        where: { id },
        data: {
            ...(payload.amountDue !== undefined ? { amountDue: payload.amountDue } : {}),
            ...(payload.amountPaid !== undefined ? { amountPaid: payload.amountPaid } : {}),
            ...(payload.dueDate !== undefined ? { dueDate: parseDate(payload.dueDate) } : {}),
            ...(status ? { status } : {}),
            ...(paidAt ? { paidAt } : {}),
        },
    });

    return { message: "Payment updated successfully", result: toMongoUpdateResult() };
};

export const PaymentService = {
    getAll,
    getById,
    update,
};
