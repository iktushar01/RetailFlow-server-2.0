export interface IGrnItemPayload {
    id?: string | number;
    productId: string;
    productName: string;
    orderedQty?: number;
    receivedQty: number;
    batch?: string;
    expiry?: string | Date | null;
    unitPrice?: number;
}

export interface IGrnPayload {
    grnNumber: string;
    poId: string;
    poNumber?: string;
    supplierId: string;
    receivedDate: string | Date;
    destinationWarehouse: string;
    items: IGrnItemPayload[];
    notes?: string;
    status?: string;
}

export interface IGrnUpdatePayload extends Partial<IGrnPayload> {
    _id?: string;
}
