import z from "zod";

export const paymentIdParamSchema = z.object({
    id: z.string().min(1, "Payment id is required"),
});

export const createPaymentSchema = z.object({
    poId: z.string().min(1),
    supplierId: z.string().min(1),
    amountDue: z.coerce.number().nonnegative(),
    amountPaid: z.coerce.number().nonnegative().optional(),
    grnId: z.string().nullable().optional(),
    poNumber: z.string().nullable().optional(),
    grnNumber: z.string().nullable().optional(),
    status: z.string().optional(),
    dueDate: z.union([z.string(), z.date()]).nullable().optional(),
});

export const updatePaymentSchema = z
    .object({
        amountDue: z.coerce.number().nonnegative().optional(),
        amountPaid: z.coerce.number().nonnegative().optional(),
        status: z.string().optional(),
        dueDate: z.union([z.string(), z.date()]).nullable().optional(),
        paidAt: z.union([z.string(), z.date()]).nullable().optional(),
        notes: z.string().optional(),
        poId: z.string().optional(),
        grnId: z.string().optional(),
        supplierId: z.string().optional(),
        poNumber: z.string().optional(),
        grnNumber: z.string().optional(),
    })
    .passthrough();
