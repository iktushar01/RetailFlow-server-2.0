import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { ReturnService } from "./return.service";

export const ReturnController = {
    getAll: catchAsync(async (_req, res) => res.send(await ReturnService.getAll())),
    create: catchAsync(async (req, res) => res.send(await ReturnService.create(req.body))),
    approve: catchAsync(async (req, res) => res.send(await ReturnService.approve(String(req.params.id)))),
    reject: catchAsync(async (req, res) => res.send(await ReturnService.reject(String(req.params.id)))),
    remove: catchAsync(async (req, res) => res.send(await ReturnService.remove(String(req.params.id)))),
};
