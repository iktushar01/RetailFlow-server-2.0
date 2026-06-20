import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { ProductService } from "./product.service";

const getAll = catchAsync(async (_req: Request, res: Response) => {
    const products = await ProductService.getAll();
    res.send(products);
});

const getById = catchAsync(async (req: Request, res: Response) => {
    const product = await ProductService.getById(String(req.params.id));
    res.send(product);
});

const create = catchAsync(async (req: Request, res: Response) => {
    const product = await ProductService.create(req.body);
    res.send(product);
});

const update = catchAsync(async (req: Request, res: Response) => {
    const { _id, ...payload } = req.body;
    const result = await ProductService.update(String(req.params.id), payload);
    res.send(result);
});

const remove = catchAsync(async (req: Request, res: Response) => {
    const result = await ProductService.remove(String(req.params.id));
    res.send(result);
});

const getByBarcode = catchAsync(async (req: Request, res: Response) => {
    const product = await ProductService.getByBarcode(String(req.params.barcode));
    res.send(product);
});

const getTopSelling = catchAsync(async (req: Request, res: Response) => {
    const products = await ProductService.getTopSelling(
        req.query.limit ? Number(req.query.limit) : 5,
    );
    res.send(products);
});

const updatePrice = catchAsync(async (req: Request, res: Response) => {
    const result = await ProductService.updatePrice(
        String(req.params.id),
        req.body.sellingPrice,
    );
    res.send(result);
});

export const ProductController = {
    getAll,
    getById,
    getByBarcode,
    getTopSelling,
    create,
    update,
    updatePrice,
    remove,
};
