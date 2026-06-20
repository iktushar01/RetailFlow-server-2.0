import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { StockTransferService } from "./stockTransfer.service";

const getAll = catchAsync(async (_req: Request, res: Response) => {
    const transfers = await StockTransferService.getAll();
    res.send(transfers);
});

const create = catchAsync(async (req: Request, res: Response) => {
    const result = await StockTransferService.create(req.body);
    res.send(result);
});

export const StockTransferController = {
    getAll,
    create,
};
