import AppError from "../../errorHelpers/AppError";
import { StatusCodes } from "http-status-codes";

const notImplemented = () => {
    throw new AppError(
        StatusCodes.NOT_IMPLEMENTED,
        "Inventory module not implemented yet",
    );
};

export const InventoryService = {
    notImplemented,
};
