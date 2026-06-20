export interface IBatchPayload {
    productId: string;
    batchNumber: string;
    quantity?: number;
    expiry?: string | Date | null;
    manufacturingDate?: string | Date | null;
    notes?: string;
}

export interface IBatchUpdatePayload extends Partial<IBatchPayload> {
    _id?: string;
}
