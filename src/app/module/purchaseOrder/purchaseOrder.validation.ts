import z from "zod";

export const purchaseOrderIdParamSchema = z.object({
    id: z.string().min(1, "Purchase order id is required"),
});
