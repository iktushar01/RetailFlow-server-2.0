import z from "zod";

export const warehouseIdParamSchema = z.object({
    id: z.string().min(1, "Warehouse id is required"),
});

export const createWarehouseSchema = z.object({
    name: z.string().min(1, "Warehouse name is required").trim(),
    location: z.string().trim().optional(),
    address: z.string().trim().optional(),
    capacity: z.coerce.number().int().positive().optional(),
    isActive: z.boolean().optional(),
});

export const updateWarehouseSchema = createWarehouseSchema.partial().passthrough();
