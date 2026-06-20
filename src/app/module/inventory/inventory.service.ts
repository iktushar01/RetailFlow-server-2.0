import AppError from "../../errorHelpers/AppError";
import { prisma } from "../../lib/prisma";
import { StatusCodes } from "http-status-codes";
import { toMongoUpdateResult } from "../../utils/mongoCompat";
import { IInventoryBarcodePayload } from "./inventory.interface";

const updateBarcode = async (id: string, payload: IInventoryBarcodePayload) => {
    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (!existing) {
        throw new AppError(StatusCodes.NOT_FOUND, "Inventory item not found");
    }

    if (payload.barcode) {
        const duplicate = await prisma.inventory.findFirst({
            where: {
                barcode: payload.barcode,
                NOT: { id },
            },
        });

        if (duplicate) {
            throw new AppError(StatusCodes.BAD_REQUEST, "Barcode already exists");
        }
    }

    await prisma.inventory.update({
        where: { id },
        data: {
            ...(payload.barcode ? { barcode: payload.barcode } : {}),
            ...(payload.qrCode ? { qrCode: payload.qrCode } : {}),
        },
    });

    return {
        message: "Barcode updated successfully",
        result: toMongoUpdateResult(),
    };
};

export const InventoryService = {
    updateBarcode,
};
