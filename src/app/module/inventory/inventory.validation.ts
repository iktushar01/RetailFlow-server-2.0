import z from "zod";

export const inventoryIdParamSchema = z.object({
    id: z.string().min(1, "Inventory id is required"),
});

export const inventoryProductIdParamSchema = z.object({
    productId: z.string().min(1, "Product id is required"),
});

export const lowStockParamSchema = z.object({
    threshold: z.coerce.number().int().nonnegative(),
});

export const createInventorySchema = z.object({
    productId: z.string().min(1),
    productName: z.string().optional(),
    stockQty: z.coerce.number().int().nonnegative().optional(),
    location: z.string().optional(),
    batch: z.string().optional(),
    expiry: z.union([z.string(), z.date()]).nullable().optional(),
    barcode: z.string().optional(),
    qrCode: z.string().optional(),
});

export const updateInventorySchema = createInventorySchema.partial().passthrough();

export const updateInventoryStockSchema = z.object({
    stockQty: z.coerce.number().int().optional(),
    quantity: z.coerce.number().int().optional(),
});

export const updateInventoryBarcodeSchema = z
    .object({
        barcode: z.string().optional(),
        qrCode: z.string().optional(),
    })
    .refine((data) => data.barcode || data.qrCode, {
        message: "Barcode or QR code is required",
    });
