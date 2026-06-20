import z from "zod";

export const paymentIdParamSchema = z.object({
    id: z.string().min(1, "Payment id is required"),
});
