import z from "zod";

export const createCustomerSchema = z.object({
    name: z.string().min(1).trim(),
    phone: z.string().nullable().optional(),
    email: z.string().email().nullable().optional().or(z.literal("")),
    address: z.string().nullable().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerIdParamSchema = z.object({
    id: z.string().min(1),
});
