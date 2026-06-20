import z from "zod";

export const createDiscountSchema = z.object({
    offerName: z.string().min(1),
    code: z.string().optional(),
    type: z.enum(["Percentage", "Flat"]),
    value: z.coerce.number().positive(),
    validFrom: z.union([z.string(), z.date()]),
    validTo: z.union([z.string(), z.date()]),
    status: z.enum(["Active", "Inactive"]).optional(),
    applicableProducts: z.array(z.string()).optional(),
    applicableCategories: z.array(z.string()).optional(),
});

export const updateDiscountSchema = createDiscountSchema.partial().passthrough();
export const discountIdParamSchema = z.object({ id: z.string().min(1) });
