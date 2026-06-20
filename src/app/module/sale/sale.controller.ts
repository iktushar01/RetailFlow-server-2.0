import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { SaleService } from "./sale.service";

const getAll = catchAsync(async (req: Request, res: Response) => {
    const sales = await SaleService.getAll({
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        sort: typeof req.query.sort === "string" ? req.query.sort : undefined,
        status: typeof req.query.status === "string" ? req.query.status : undefined,
    });
    res.send(sales);
});

const getById = catchAsync(async (req: Request, res: Response) => {
    const sale = await SaleService.getById(String(req.params.id));
    res.send(sale);
});

const getByInvoiceNo = catchAsync(async (req: Request, res: Response) => {
    const sale = await SaleService.getByInvoiceNo(String(req.params.invoiceNo));
    res.send(sale);
});

const create = catchAsync(async (req: Request, res: Response) => {
    const sale = await SaleService.create(req.body);
    res.send(sale);
});

const hold = catchAsync(async (req: Request, res: Response) => {
    const sale = await SaleService.hold(req.body);
    res.send(sale);
});

const remove = catchAsync(async (req: Request, res: Response) => {
    const result = await SaleService.remove(String(req.params.id));
    res.send(result);
});

const update = catchAsync(async (req: Request, res: Response) => {
    const { _id, ...payload } = req.body;
    const sale = await SaleService.update(String(req.params.id), payload);
    res.send(sale);
});

const analytics = catchAsync(async (req: Request, res: Response) => {
    const period = typeof req.query.period === "string" ? req.query.period : "week";
    const data = await SaleService.getAnalytics(period);
    sendResponse(res, { statusCode: StatusCodes.OK, success: true, data });
});

const summary = catchAsync(async (req: Request, res: Response) => {
    const data = await SaleService.getSummary(
        typeof req.query.dateFrom === "string" ? req.query.dateFrom : undefined,
        typeof req.query.dateTo === "string" ? req.query.dateTo : undefined,
    );
    sendResponse(res, { statusCode: StatusCodes.OK, success: true, data });
});

const topProducts = catchAsync(async (req: Request, res: Response) => {
    const data = await SaleService.getTopProducts(
        req.query.limit ? Number(req.query.limit) : 5,
    );
    sendResponse(res, { statusCode: StatusCodes.OK, success: true, data });
});

const dateRange = catchAsync(async (req: Request, res: Response) => {
    const data = await SaleService.getByDateRange(
        String(req.query.dateFrom),
        String(req.query.dateTo),
    );
    sendResponse(res, { statusCode: StatusCodes.OK, success: true, data });
});

const exportData = catchAsync(async (_req: Request, res: Response) => {
    const csv = await SaleService.exportData();
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="sales-export.csv"');
    res.send(csv);
});

export const SaleController = {
    getAll,
    getById,
    getByInvoiceNo,
    create,
    hold,
    update,
    remove,
    analytics,
    summary,
    topProducts,
    dateRange,
    exportData,
};
