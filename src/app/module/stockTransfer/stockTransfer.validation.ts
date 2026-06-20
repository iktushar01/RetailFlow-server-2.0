import z from "zod";

export const createStockTransferSchema = z.object({
    productId: z.string().min(1, "Product id is required"),
    productName: z.string().optional(),
    sourceWarehouse: z.string().min(1, "Source warehouse is required"),
    destinationWarehouse: z.string().min(1, "Destination warehouse is required"),
    quantity: z.coerce.number().int().positive(),
});
