import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { SalesPaymentService } from "./salesPayment.service";

export const SalesPaymentController = {
    getAll: catchAsync(async (_req, res) => res.send(await SalesPaymentService.getAll())),
    getById: catchAsync(async (req, res) => res.send(await SalesPaymentService.getById(String(req.params.id)))),
    getByInvoiceNo: catchAsync(async (req, res) =>
        res.send(await SalesPaymentService.getByInvoiceNo(String(req.params.invoiceNo))),
    ),
    create: catchAsync(async (req, res) => res.send(await SalesPaymentService.create(req.body))),
    update: catchAsync(async (req, res) => {
        const { _id, ...payload } = req.body;
        res.send(await SalesPaymentService.update(String(req.params.id), payload));
    }),
    remove: catchAsync(async (req, res) => res.send(await SalesPaymentService.remove(String(req.params.id)))),
};
