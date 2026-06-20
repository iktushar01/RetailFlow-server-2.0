import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { CustomerService } from "./customer.service";

export const CustomerController = {
    getAll: catchAsync(async (_req, res) => res.send(await CustomerService.getAll())),
    getById: catchAsync(async (req, res) => res.send(await CustomerService.getById(String(req.params.id)))),
    create: catchAsync(async (req, res) => res.send(await CustomerService.create(req.body))),
    update: catchAsync(async (req, res) => {
        const { _id, ...payload } = req.body;
        res.send(await CustomerService.update(String(req.params.id), payload));
    }),
    remove: catchAsync(async (req, res) => res.send(await CustomerService.remove(String(req.params.id)))),
};
