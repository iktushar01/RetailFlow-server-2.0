import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { PaymentService } from "./payment.service";

const notImplemented = catchAsync(async (_req: Request, _res: Response) => {
    PaymentService.notImplemented();
});

export const PaymentController = {
    notImplemented,
};
