import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { PurchaseOrderService } from "./purchaseOrder.service";

const notImplemented = catchAsync(async (_req: Request, res: Response) => {
    PurchaseOrderService.notImplemented();
    res.status(501).send({ message: "Not implemented" });
});

export const PurchaseOrderController = {
    notImplemented,
};
