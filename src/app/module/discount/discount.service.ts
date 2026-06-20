import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { DiscountStatus, DiscountType } from "../../../generated/prisma";
import { StatusCodes } from "http-status-codes";
import { toMongoDeleteResult, toMongoDoc, toMongoDocs, toMongoUpdateResult } from "../../utils/mongoCompat";
import { decimalToNumber } from "../../utils/retailFormatters";
import { IDiscountPayload, IDiscountUpdatePayload } from "./discount.interface";

const includeRelations = {
    applicableProducts: true,
    applicableCategories: true,
} as const;

const formatDiscount = (discount: {
    id: string;
    offerName: string;
    code: string | null;
    type: string;
    value: { toNumber?: () => number } | number;
    validFrom: Date;
    validTo: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    applicableProducts: Array<{ productId: string }>;
    applicableCategories: Array<{ category: string }>;
}) => ({
    ...toMongoDoc(discount),
    type: discount.type,
    value: decimalToNumber(discount.value),
    applicableProducts: discount.applicableProducts.map((p) => p.productId),
    applicableCategories: discount.applicableCategories.map((c) => c.category),
});

const parseDate = (value: string | Date) => (value instanceof Date ? value : new Date(value));

const mapType = (type: string) =>
    type === "Flat" ? DiscountType.Flat : DiscountType.Percentage;

const mapStatus = (status?: string) =>
    status === "Inactive" ? DiscountStatus.Inactive : DiscountStatus.Active;

const getAll = async () => {
    const discounts = await prisma.discount.findMany({
        include: includeRelations,
        orderBy: { createdAt: "desc" },
    });
    return discounts.map(formatDiscount);
};

const getActive = async () => {
    const now = new Date();
    const discounts = await prisma.discount.findMany({
        where: {
            status: DiscountStatus.Active,
            validFrom: { lte: now },
            validTo: { gte: now },
        },
        include: includeRelations,
    });
    return discounts.map(formatDiscount);
};

const getById = async (id: string) => {
    const discount = await prisma.discount.findUnique({
        where: { id },
        include: includeRelations,
    });
    if (!discount) throw new AppError(StatusCodes.NOT_FOUND, "Discount not found");
    return formatDiscount(discount);
};

const syncRelations = async (
    discountId: string,
    products?: string[],
    categories?: string[],
) => {
    if (products) {
        await prisma.discountProduct.deleteMany({ where: { discountId } });
        if (products.length) {
            await prisma.discountProduct.createMany({
                data: products.map((productId) => ({ discountId, productId })),
            });
        }
    }
    if (categories) {
        await prisma.discountCategory.deleteMany({ where: { discountId } });
        if (categories.length) {
            await prisma.discountCategory.createMany({
                data: categories.map((category) => ({ discountId, category })),
            });
        }
    }
};

const create = async (payload: IDiscountPayload) => {
    const discount = await prisma.discount.create({
        data: {
            offerName: payload.offerName,
            code: payload.code ?? null,
            type: mapType(payload.type),
            value: payload.value,
            validFrom: parseDate(payload.validFrom),
            validTo: parseDate(payload.validTo),
            status: mapStatus(payload.status),
        },
        include: includeRelations,
    });
    await syncRelations(
        discount.id,
        payload.applicableProducts,
        payload.applicableCategories,
    );
    return formatDiscount(
        (await prisma.discount.findUnique({
            where: { id: discount.id },
            include: includeRelations,
        }))!,
    );
};

const update = async (id: string, payload: IDiscountUpdatePayload) => {
    const existing = await prisma.discount.findUnique({ where: { id } });
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Discount not found");

    await prisma.discount.update({
        where: { id },
        data: {
            ...(payload.offerName ? { offerName: payload.offerName } : {}),
            ...(payload.code !== undefined ? { code: payload.code ?? null } : {}),
            ...(payload.type ? { type: mapType(payload.type) } : {}),
            ...(payload.value !== undefined ? { value: payload.value } : {}),
            ...(payload.validFrom ? { validFrom: parseDate(payload.validFrom) } : {}),
            ...(payload.validTo ? { validTo: parseDate(payload.validTo) } : {}),
            ...(payload.status ? { status: mapStatus(payload.status) } : {}),
        },
    });
    await syncRelations(id, payload.applicableProducts, payload.applicableCategories);
    return toMongoUpdateResult();
};

const remove = async (id: string) => {
    const existing = await prisma.discount.findUnique({ where: { id } });
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Discount not found");
    await prisma.discount.delete({ where: { id } });
    return toMongoDeleteResult();
};

const toggle = async (id: string) => {
    const existing = await prisma.discount.findUnique({ where: { id } });
    if (!existing) throw new AppError(StatusCodes.NOT_FOUND, "Discount not found");
    const nextStatus =
        existing.status === DiscountStatus.Active
            ? DiscountStatus.Inactive
            : DiscountStatus.Active;
    await prisma.discount.update({ where: { id }, data: { status: nextStatus } });
    return toMongoUpdateResult();
};

export const DiscountService = {
    getAll,
    getActive,
    getById,
    create,
    update,
    remove,
    toggle,
};
