import z from "zod";

export const batchIdParamSchema = z.object({
    id: z.string().min(1, "Batch id is required"),
});

export const createBatchSchema = z.object({
    productId: z.string().min(1),
    batchNumber: z.string().min(1),
    quantity: z.coerce.number().int().nonnegative().optional(),
    expiry: z.union([z.string(), z.date()]).nullable().optional(),
    manufacturingDate: z.union([z.string(), z.date()]).nullable().optional(),
    notes: z.string().optional(),
});

export const updateBatchSchema = createBatchSchema.partial().passthrough();
