import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { InventoryService } from "./inventory.service";

export const InventoryController = {
    getAll: catchAsync(async (_req, res) => res.send(await InventoryService.getAll())),
    getProducts: catchAsync(async (_req, res) => res.send(await InventoryService.getProducts())),
    getLowStock: catchAsync(async (req, res) =>
        res.send(await InventoryService.getLowStock(Number(req.params.threshold))),
    ),
    getById: catchAsync(async (req, res) =>
        res.send(await InventoryService.getById(String(req.params.id))),
    ),
    getByProductId: catchAsync(async (req, res) =>
        res.send(await InventoryService.getByProductId(String(req.params.productId))),
    ),
    create: catchAsync(async (req, res) => res.send(await InventoryService.create(req.body))),
    update: catchAsync(async (req, res) => {
        const { _id, ...payload } = req.body;
        res.send(await InventoryService.update(String(req.params.id), payload));
    }),
    updateStock: catchAsync(async (req, res) =>
        res.send(await InventoryService.updateStock(String(req.params.id), req.body)),
    ),
    remove: catchAsync(async (req, res) =>
        res.send(await InventoryService.remove(String(req.params.id))),
    ),
    updateBarcode: catchAsync(async (req, res) =>
        res.send(await InventoryService.updateBarcode(String(req.params.id), req.body)),
    ),
};
