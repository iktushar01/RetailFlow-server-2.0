import z from "zod";

export const grnIdParamSchema = z.object({
    id: z.string().min(1, "GRN id is required"),
});

export const grnPoIdParamSchema = z.object({
    poId: z.string().min(1, "Purchase order id is required"),
});
