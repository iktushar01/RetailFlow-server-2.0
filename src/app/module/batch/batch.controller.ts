import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { BatchService } from "./batch.service";

export const BatchController = {
    getAll: catchAsync(async (_req, res) => res.send(await BatchService.getAll())),
    create: catchAsync(async (req, res) => res.send(await BatchService.create(req.body))),
    update: catchAsync(async (req, res) => {
        const { _id, ...payload } = req.body;
        res.send(await BatchService.update(String(req.params.id), payload));
    }),
    remove: catchAsync(async (req, res) =>
        res.send(await BatchService.remove(String(req.params.id))),
    ),
};
