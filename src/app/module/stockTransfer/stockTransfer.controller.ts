import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { StockTransferService } from "./stockTransfer.service";

const notImplemented = catchAsync(async (_req: Request, _res: Response) => {
    StockTransferService.notImplemented();
});

export const StockTransferController = {
    notImplemented,
};
