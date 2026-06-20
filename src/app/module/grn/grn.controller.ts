import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { GrnService } from "./grn.service";

const notImplemented = catchAsync(async (_req: Request, _res: Response) => {
    GrnService.notImplemented();
});

export const GrnController = {
    notImplemented,
};
