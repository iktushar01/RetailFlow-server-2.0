import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { StockTransferStatus } from "../../../generated/prisma";
import { StatusCodes } from "http-status-codes";
import { toMongoDocs } from "../../utils/mongoCompat";
import { IStockTransferPayload } from "./stockTransfer.interface";

const getAll = async () => {
    const transfers = await prisma.stockTransfer.findMany({
        orderBy: { createdAt: "desc" },
    });
    return toMongoDocs(transfers);
};

const create = async (payload: IStockTransferPayload) => {
    const {
        productId,
        sourceWarehouse,
        destinationWarehouse,
        quantity,
    } = payload;

    if (sourceWarehouse === destinationWarehouse) {
        throw new AppError(
            StatusCodes.BAD_REQUEST,
            "Source and destination must be different",
        );
    }

    const result = await prisma.$transaction(async (tx) => {
        const sourceInv = await tx.inventory.findFirst({
            where: { productId, location: sourceWarehouse },
        });

        if (!sourceInv || sourceInv.stockQty < quantity) {
            throw new AppError(
                StatusCodes.BAD_REQUEST,
                `Insufficient stock. Available: ${sourceInv?.stockQty || 0}`,
            );
        }

        await tx.inventory.update({
            where: { id: sourceInv.id },
            data: { stockQty: sourceInv.stockQty - quantity },
        });

        const destInv = await tx.inventory.findFirst({
            where: { productId, location: destinationWarehouse },
        });

        if (destInv) {
            await tx.inventory.update({
                where: { id: destInv.id },
                data: { stockQty: destInv.stockQty + quantity },
            });
        } else {
            await tx.inventory.create({
                data: {
                    productId,
                    productName: sourceInv.productName ?? payload.productName ?? "",
                    stockQty: quantity,
                    location: destinationWarehouse,
                },
            });
        }

        const transfer = await tx.stockTransfer.create({
            data: {
                productId,
                productName: sourceInv.productName ?? payload.productName ?? "",
                sourceWarehouseName: sourceWarehouse,
                destinationWarehouseName: destinationWarehouse,
                quantity,
                status: StockTransferStatus.Completed,
            },
        });

        return transfer;
    });

    return {
        message: "Stock transferred successfully",
        result: { acknowledged: true, insertedId: result.id },
    };
};

export const StockTransferService = {
    getAll,
    create,
};
