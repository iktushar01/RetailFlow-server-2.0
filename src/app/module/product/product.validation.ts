import z from "zod";

export const createProductSchema = z
    .object({
        productName: z
            .string({ message: "Product name is required" })
            .min(1, "Product name is required")
            .trim(),
        category: z
            .string({ message: "Category is required" })
            .min(1, "Category is required")
            .trim(),
        brand: z.string().trim().optional(),
        sku: z
            .string({ message: "SKU is required" })
            .min(1, "SKU is required")
            .trim(),
        description: z.string().trim().optional(),
        qrCode: z.string().trim().optional(),
        barcode: z.string().trim().optional(),
        supplier: z.string().trim().optional(),
        supplierId: z.string().nullable().optional(),
        productImage: z.string().trim().optional(),
        costPrice: z.coerce.number().nonnegative().optional(),
        sellingPrice: z.coerce.number().nonnegative().optional(),
        price: z.coerce.number().nonnegative().optional(),
        reorderLevel: z.coerce.number().int().nonnegative().optional(),
        isActive: z.boolean().optional(),
        createdAt: z.string().optional(),
    })
    .passthrough();

export const updateProductSchema = createProductSchema.partial().passthrough();

export const productIdParamSchema = z.object({
    id: z.string().min(1, "Product id is required"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
