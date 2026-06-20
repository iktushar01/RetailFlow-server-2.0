import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { PurchaseOrderService } from "./purchaseOrder.service";

const getAll = catchAsync(async (req: Request, res: Response) => {
    const status =
        typeof req.query.status === "string" ? req.query.status : undefined;
    const orders = await PurchaseOrderService.getAll(status);
    res.send(orders);
});

const getById = catchAsync(async (req: Request, res: Response) => {
    const order = await PurchaseOrderService.getById(String(req.params.id));
    res.send(order);
});

const create = catchAsync(async (req: Request, res: Response) => {
    const order = await PurchaseOrderService.create(req.body);
    res.send(order);
});

const update = catchAsync(async (req: Request, res: Response) => {
    const { _id, ...payload } = req.body;
    const result = await PurchaseOrderService.update(String(req.params.id), payload);
    res.send(result);
});

const remove = catchAsync(async (req: Request, res: Response) => {
    const result = await PurchaseOrderService.remove(String(req.params.id));
    res.send(result);
});

const send = catchAsync(async (req: Request, res: Response) => {
    const result = await PurchaseOrderService.send(String(req.params.id));
    res.send(result);
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
    const result = await PurchaseOrderService.updateStatus(
        String(req.params.id),
        req.body.status,
    );
    res.send(result);
});

export const PurchaseOrderController = {
    getAll,
    getById,
    create,
    update,
    remove,
    send,
    updateStatus,
};
