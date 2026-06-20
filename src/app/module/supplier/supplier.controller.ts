import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { SupplierService } from "./supplier.service";

const getAll = catchAsync(async (_req: Request, res: Response) => {
    const suppliers = await SupplierService.getAll();
    res.send(suppliers);
});

const getById = catchAsync(async (req: Request, res: Response) => {
    const supplier = await SupplierService.getById(req.params.id);
    res.send(supplier);
});

const create = catchAsync(async (req: Request, res: Response) => {
    const supplier = await SupplierService.create(req.body);
    res.send(supplier);
});

const update = catchAsync(async (req: Request, res: Response) => {
    const result = await SupplierService.update(req.params.id, req.body);
    res.send(result);
});

const remove = catchAsync(async (req: Request, res: Response) => {
    const result = await SupplierService.remove(req.params.id);
    res.send(result);
});

export const SupplierController = {
    getAll,
    getById,
    create,
    update,
    remove,
};
