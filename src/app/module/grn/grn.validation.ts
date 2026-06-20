import z from "zod";

const grnItemSchema = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    productId: z.string().min(1, "Product id is required"),
    productName: z.string().min(1, "Product name is required"),
    orderedQty: z.coerce.number().int().nonnegative().optional(),
    receivedQty: z.coerce.number().int().nonnegative(),
    batch: z.string().optional(),
    expiry: z.union([z.string(), z.date()]).nullable().optional(),
    unitPrice: z.coerce.number().nonnegative().optional(),
});

export const createGrnSchema = z.object({
    grnNumber: z.string().min(1, "GRN number is required"),
    poId: z.string().min(1, "Purchase order id is required"),
    poNumber: z.string().optional(),
    supplierId: z.string().min(1, "Supplier id is required"),
    receivedDate: z.union([z.string(), z.date()]),
    destinationWarehouse: z.string().min(1, "Destination warehouse is required"),
    items: z.array(grnItemSchema).min(1, "At least one item is required"),
    notes: z.string().optional(),
    status: z.string().optional(),
});

export const updateGrnSchema = createGrnSchema.partial().passthrough();

export const grnIdParamSchema = z.object({
    id: z.string().min(1, "GRN id is required"),
});

export const grnPoIdParamSchema = z.object({
    poId: z.string().min(1, "Purchase order id is required"),
});
