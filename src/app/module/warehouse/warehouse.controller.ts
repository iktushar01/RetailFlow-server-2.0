import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { WarehouseService } from "./warehouse.service";

const getAll = catchAsync(async (_req: Request, res: Response) => {
    const warehouses = await WarehouseService.getAll();
    res.send(warehouses);
});

const create = catchAsync(async (req: Request, res: Response) => {
    const result = await WarehouseService.create(req.body);
    res.send(result);
});

const update = catchAsync(async (req: Request, res: Response) => {
    const { _id, ...payload } = req.body;
    const result = await WarehouseService.update(String(req.params.id), payload);
    res.send(result);
});

const remove = catchAsync(async (req: Request, res: Response) => {
    const result = await WarehouseService.remove(String(req.params.id));
    res.send(result);
});

export const WarehouseController = {
    getAll,
    create,
    update,
    remove,
};
