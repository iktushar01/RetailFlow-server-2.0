import z from "zod";

const returnItemSchema = z.object({
    productId: z.string().min(1),
    productName: z.string().min(1),
    quantity: z.coerce.number().int().positive(),
    unitPrice: z.coerce.number().nonnegative(),
});

export const createReturnSchema = z.object({
    invoiceNo: z.string().min(1),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    items: z.array(returnItemSchema).min(1),
    reason: z.string().min(1),
    notes: z.string().optional(),
});

export const returnIdParamSchema = z.object({ id: z.string().min(1) });
