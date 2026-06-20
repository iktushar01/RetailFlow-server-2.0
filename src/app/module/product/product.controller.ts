import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { ProductService } from "./product.service";

const getAll = catchAsync(async (_req: Request, res: Response) => {
    const products = await ProductService.getAll();
    res.send(products);
});

const getById = catchAsync(async (req: Request, res: Response) => {
    const product = await ProductService.getById(req.params.id);
    res.send(product);
});

const create = catchAsync(async (req: Request, res: Response) => {
    const product = await ProductService.create(req.body);
    res.send(product);
});

const update = catchAsync(async (req: Request, res: Response) => {
    const { _id, ...payload } = req.body;
    const result = await ProductService.update(req.params.id, payload);
    res.send(result);
});

const remove = catchAsync(async (req: Request, res: Response) => {
    const result = await ProductService.remove(req.params.id);
    res.send(result);
});

export const ProductController = {
    getAll,
    getById,
    create,
    update,
    remove,
};
