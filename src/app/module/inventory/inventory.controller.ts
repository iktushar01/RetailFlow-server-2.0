import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { InventoryService } from "./inventory.service";

const notImplemented = catchAsync(async (_req: Request, _res: Response) => {
    InventoryService.notImplemented();
});

export const InventoryController = {
    notImplemented,
};
