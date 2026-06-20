import z from "zod";

export const inventoryIdParamSchema = z.object({
    id: z.string().min(1, "Inventory id is required"),
});

export const inventoryProductIdParamSchema = z.object({
    productId: z.string().min(1, "Product id is required"),
});
