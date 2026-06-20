import z from "zod";

export const stockTransferIdParamSchema = z.object({
    id: z.string().min(1, "Stock transfer id is required"),
});
