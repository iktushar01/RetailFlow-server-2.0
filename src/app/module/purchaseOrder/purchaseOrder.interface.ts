export interface IPurchaseOrderItemPayload {
    id?: string | number;
    product?: string;
    productId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal?: number;
}

export interface IPurchaseOrderPayload {
    supplier: string;
    poNumber: string;
    poDate: string | Date;
    expectedDeliveryDate?: string | Date | null;
    items: IPurchaseOrderItemPayload[];
    notes?: string;
    tax?: number;
    subtotal?: number;
    taxAmount?: number;
    total?: number;
    status?: string;
}

export interface IPurchaseOrderUpdatePayload extends Partial<IPurchaseOrderPayload> {
    _id?: string;
}

export interface IPurchaseOrderStatusPayload {
    status: string;
}
