import z from "zod";

export const inventoryIdParamSchema = z.object({
    id: z.string().min(1, "Inventory id is required"),
});

export const updateInventoryBarcodeSchema = z
    .object({
        barcode: z.string().optional(),
        qrCode: z.string().optional(),
    })
    .refine((data) => data.barcode || data.qrCode, {
        message: "Barcode or QR code is required",
    });
