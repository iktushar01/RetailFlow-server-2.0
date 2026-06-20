import AppError from "../../errorHelpers/AppError";
import { StatusCodes } from "http-status-codes";

const notImplemented = () => {
    throw new AppError(
        StatusCodes.NOT_IMPLEMENTED,
        "Stock transfer module not implemented yet",
    );
};

export const StockTransferService = {
    notImplemented,
};
