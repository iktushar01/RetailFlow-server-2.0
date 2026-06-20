import AppError from "../../errorHelpers/AppError";
import { StatusCodes } from "http-status-codes";

const notImplemented = () => {
    throw new AppError(
        StatusCodes.NOT_IMPLEMENTED,
        "Warehouse module not implemented yet",
    );
};

export const WarehouseService = {
    notImplemented,
};
