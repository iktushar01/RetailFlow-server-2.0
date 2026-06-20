import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { StatusCodes } from "http-status-codes";
import { toMongoDeleteResult, toMongoDoc, toMongoDocs, toMongoUpdateResult } from "../../utils/mongoCompat";
import { ICustomerPayload, ICustomerUpdatePayload } from "./customer.interface";

const getAll = async () => toMongoDocs(await prisma.customer.findMany({ orderBy: { createdAt: "desc" } }));

const getById = async (id: string) => {
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new AppError(StatusCodes.NOT_FOUND, "Customer not found");
    return toMongoDoc(customer);
};

const create = async (payload: ICustomerPayload) =>
    toMongoDoc(
        await prisma.customer.create({
            data: {
                name: payload.name,
                phone: payload.phone ?? null,
                email: payload.email || null,
                address: payload.address ?? null,
            },
        }),
    );

const update = async (id: string, payload: ICustomerUpdatePayload) => {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Customer not found");
    await prisma.customer.update({ where: { id }, data: payload });
    return toMongoUpdateResult();
};

const remove = async (id: string) => {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Customer not found");
    await prisma.customer.delete({ where: { id } });
    return toMongoDeleteResult();
};

export const CustomerService = { getAll, getById, create, update, remove };
