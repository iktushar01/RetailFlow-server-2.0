import AppError from "../../errorHelpers/AppError";
import { StatusCodes } from "http-status-codes";

const notImplemented = () => {
    throw new AppError(
        StatusCodes.NOT_IMPLEMENTED,
        "Batch module not implemented yet",
    );
};

export const BatchService = {
    notImplemented,
};
