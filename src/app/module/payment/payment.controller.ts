import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { PaymentService } from "./payment.service";

const getAll = catchAsync(async (_req: Request, res: Response) => {
    const payments = await PaymentService.getAll();
    res.send(payments);
});

const getById = catchAsync(async (req: Request, res: Response) => {
    const payment = await PaymentService.getById(String(req.params.id));
    res.send(payment);
});

const update = catchAsync(async (req: Request, res: Response) => {
    const { _id, ...payload } = req.body;
    const result = await PaymentService.update(String(req.params.id), payload);
    res.send(result);
});

export const PaymentController = {
    getAll,
    getById,
    update,
};
