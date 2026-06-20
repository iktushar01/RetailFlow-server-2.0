import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { BatchService } from "./batch.service";

const notImplemented = catchAsync(async (_req: Request, _res: Response) => {
    BatchService.notImplemented();
});

export const BatchController = {
    notImplemented,
};
