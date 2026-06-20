import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { InventoryService } from "./inventory.service";

const updateBarcode = catchAsync(async (req: Request, res: Response) => {
    const result = await InventoryService.updateBarcode(
        String(req.params.id),
        req.body,
    );
    res.send(result);
});

export const InventoryController = {
    updateBarcode,
};
