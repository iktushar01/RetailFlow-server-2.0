import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { GrnService } from "./grn.service";

const getAll = catchAsync(async (_req: Request, res: Response) => {
    const grns = await GrnService.getAll();
    res.send(grns);
});

const getCumulativeReceivedByPo = catchAsync(async (req: Request, res: Response) => {
    const data = await GrnService.getCumulativeReceivedByPo(String(req.params.poId));
    res.send(data);
});

const getById = catchAsync(async (req: Request, res: Response) => {
    const grn = await GrnService.getById(String(req.params.id));
    res.send(grn);
});

const create = catchAsync(async (req: Request, res: Response) => {
    const result = await GrnService.create(req.body);
    res.send(result);
});

const update = catchAsync(async (req: Request, res: Response) => {
    const { _id, ...payload } = req.body;
    const result = await GrnService.update(String(req.params.id), payload);
    res.send(result);
});

const remove = catchAsync(async (req: Request, res: Response) => {
    const result = await GrnService.remove(String(req.params.id));
    res.send(result);
});

const approve = catchAsync(async (req: Request, res: Response) => {
    const result = await GrnService.approve(String(req.params.id));
    res.send(result);
});

const reject = catchAsync(async (req: Request, res: Response) => {
    const result = await GrnService.reject(String(req.params.id));
    res.send(result);
});

export const GrnController = {
    getAll,
    getCumulativeReceivedByPo,
    getById,
    create,
    update,
    remove,
    approve,
    reject,
};
