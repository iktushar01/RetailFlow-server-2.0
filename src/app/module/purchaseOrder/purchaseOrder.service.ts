import AppError from "../../errorHelpers/AppError";
import { StatusCodes } from "http-status-codes";

const notImplemented = () => {
    throw new AppError(
        StatusCodes.NOT_IMPLEMENTED,
        "Purchase order module not implemented yet",
    );
};

export const PurchaseOrderService = {
    notImplemented,
};
