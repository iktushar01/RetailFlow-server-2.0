import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { AiService } from "./ai.service";

const reorderSuggestions = catchAsync(async (_req: Request, res: Response) => {
    const data = await AiService.getReorderSuggestions();
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        data,
    });
});

const query = catchAsync(async (req: Request, res: Response) => {
    const queryText = typeof req.body?.query === "string" ? req.body.query : "";
    const data = await AiService.naturalLanguageQuery(queryText);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        data,
    });
});

export const AiController = {
    reorderSuggestions,
    query,
};
