import z from "zod";

export const batchIdParamSchema = z.object({
    id: z.string().min(1, "Batch id is required"),
});
