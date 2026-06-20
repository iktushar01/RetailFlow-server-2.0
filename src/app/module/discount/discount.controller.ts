import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { DiscountService } from "./discount.service";

export const DiscountController = {
    getAll: catchAsync(async (_req, res) => res.send(await DiscountService.getAll())),
    getActive: catchAsync(async (_req, res) => res.send(await DiscountService.getActive())),
    getById: catchAsync(async (req, res) => res.send(await DiscountService.getById(String(req.params.id)))),
    create: catchAsync(async (req, res) => res.send(await DiscountService.create(req.body))),
    update: catchAsync(async (req, res) => {
        const { _id, ...payload } = req.body;
        res.send(await DiscountService.update(String(req.params.id), payload));
    }),
    remove: catchAsync(async (req, res) => res.send(await DiscountService.remove(String(req.params.id)))),
    toggle: catchAsync(async (req, res) => res.send(await DiscountService.toggle(String(req.params.id)))),
};
