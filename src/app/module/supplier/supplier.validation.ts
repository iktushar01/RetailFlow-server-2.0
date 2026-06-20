import z from "zod";

const phoneSchema = z
    .string({ message: "Phone is required" })
    .min(7, "Phone must be at least 7 characters")
    .max(20, "Phone must be at most 20 characters");

const emailSchema = z
    .string({ message: "Email is required" })
    .email("Invalid email address")
    .trim();

export const createSupplierSchema = z.object({
    supplierName: z
        .string({ message: "Supplier name is required" })
        .min(1, "Supplier name is required")
        .trim(),
    contactPerson: z
        .string({ message: "Contact person is required" })
        .min(1, "Contact person is required")
        .trim(),
    email: emailSchema,
    phone: phoneSchema,
    address: z
        .string({ message: "Address is required" })
        .min(1, "Address is required")
        .trim(),
    notes: z.string().trim().optional(),
    status: z.string().trim().optional(),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const supplierIdParamSchema = z.object({
    id: z.string().min(1, "Supplier id is required"),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
