import z from "zod";

export const createSalesPaymentSchema = z.object({
    invoiceNo: z.string().min(1),
    saleId: z.string().optional(),
    customerId: z.string().nullable().optional(),
    customerName: z.string().optional(),
    amount: z.coerce.number().positive(),
    paymentMethod: z.string().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
});

export const updateSalesPaymentSchema = createSalesPaymentSchema.partial().passthrough();
export const salesPaymentIdParamSchema = z.object({ id: z.string().min(1) });
export const salesPaymentInvoiceParamSchema = z.object({ invoiceNo: z.string().min(1) });
