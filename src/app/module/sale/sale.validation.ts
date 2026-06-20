import z from "zod";

const saleItemSchema = z.object({
    productId: z.string().min(1),
    productName: z.string().min(1),
    quantity: z.coerce.number().int().positive(),
    unitPrice: z.coerce.number().nonnegative(),
    discount: z.coerce.number().nonnegative().optional(),
    discountType: z.string().optional(),
    subtotal: z.coerce.number().nonnegative().optional(),
});

export const createSaleSchema = z.object({
    invoiceNo: z.string().min(1),
    customerId: z.string().nullable().optional(),
    customerName: z.string().min(1),
    customerPhone: z.string().nullable().optional(),
    items: z.array(saleItemSchema).min(1),
    subtotal: z.coerce.number().nonnegative(),
    totalDiscount: z.coerce.number().nonnegative().optional(),
    tax: z.coerce.number().nonnegative().optional(),
    grandTotal: z.coerce.number().nonnegative(),
    paymentMethod: z.string().nullable().optional(),
    paymentStatus: z.string().optional(),
    amountPaid: z.coerce.number().nonnegative().optional(),
    status: z.string().optional(),
    notes: z.string().optional(),
});

export const updateSaleSchema = createSaleSchema.partial().passthrough();

export const saleIdParamSchema = z.object({
    id: z.string().min(1),
});

export const saleInvoiceParamSchema = z.object({
    invoiceNo: z.string().min(1),
});

export const saleAnalyticsQuerySchema = z.object({
    period: z.enum(["day", "week", "month", "year"]).optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    limit: z.coerce.number().int().positive().optional(),
    format: z.string().optional(),
});
