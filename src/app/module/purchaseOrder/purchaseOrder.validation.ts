import z from "zod";

const poItemSchema = z.object({
    id: z.union([z.string(), z.number()]).optional(),
    product: z.string().optional(),
    productId: z.string().optional(),
    productName: z.string().min(1, "Product name is required"),
    quantity: z.coerce.number().int().positive(),
    unitPrice: z.coerce.number().nonnegative(),
    subtotal: z.coerce.number().nonnegative().optional(),
});

export const createPurchaseOrderSchema = z.object({
    supplier: z.string().min(1, "Supplier is required"),
    poNumber: z.string().min(1, "PO number is required"),
    poDate: z.union([z.string(), z.date()]),
    expectedDeliveryDate: z.union([z.string(), z.date()]).nullable().optional(),
    items: z.array(poItemSchema).min(1, "At least one item is required"),
    notes: z.string().optional(),
    tax: z.coerce.number().nonnegative().optional(),
    subtotal: z.coerce.number().nonnegative().optional(),
    taxAmount: z.coerce.number().nonnegative().optional(),
    total: z.coerce.number().nonnegative().optional(),
    status: z.string().optional(),
});

export const updatePurchaseOrderSchema = createPurchaseOrderSchema.partial().passthrough();

export const purchaseOrderIdParamSchema = z.object({
    id: z.string().min(1, "Purchase order id is required"),
});

export const updatePurchaseOrderStatusSchema = z.object({
    status: z.string().min(1, "Status is required"),
});

export const purchaseOrderQuerySchema = z.object({
    status: z.string().optional(),
});
