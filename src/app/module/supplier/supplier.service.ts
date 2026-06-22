import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { Prisma } from "../../lib/prisma-exports";
import { StatusCodes } from "http-status-codes";
import {
    toMongoDeleteResult,
    toMongoDoc,
    toMongoDocs,
} from "../../utils/mongoCompat";
import {
    ISupplierPayload,
    ISupplierUpdatePayload,
} from "./supplier.interface";

const getAll = async () => {
    const suppliers = await prisma.supplier.findMany({
        orderBy: { createdAt: "desc" },
    });
    return toMongoDocs(suppliers);
};

const getById = async (id: string) => {
    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
        throw new AppError(StatusCodes.NOT_FOUND, "Supplier not found");
    }
    return toMongoDoc(supplier);
};

const create = async (payload: ISupplierPayload) => {
    const supplier = await prisma.supplier.create({
        data: {
            supplierName: payload.supplierName,
            contactPerson: payload.contactPerson,
            email: payload.email,
            phone: payload.phone,
            address: payload.address,
            notes: payload.notes ?? null,
            status: payload.status ?? "Active",
        },
    });
    return toMongoDoc(supplier);
};

const update = async (id: string, payload: ISupplierUpdatePayload) => {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "Supplier not found");
    }

    const supplier = await prisma.supplier.update({
        where: { id },
        data: payload,
    });

    return toMongoDoc(supplier);
};

const remove = async (id: string) => {
    const existing = await prisma.supplier.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "Supplier not found");
    }

    try {
        await prisma.supplier.delete({ where: { id } });
    } catch (err) {
        if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2003"
        ) {
            throw new AppError(
                StatusCodes.CONFLICT,
                "Cannot delete supplier with linked purchase orders, GRNs, or payments.",
            );
        }
        throw err;
    }

    return toMongoDeleteResult();
};

export const SupplierService = {
    getAll,
    getById,
    create,
    update,
    remove,
};
