import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { WarehouseService } from "./warehouse.service";

const notImplemented = catchAsync(async (_req: Request, _res: Response) => {
    WarehouseService.notImplemented();
});

export const WarehouseController = {
    notImplemented,
};
