export interface IInventoryPayload {
    productId: string;
    productName?: string;
    stockQty?: number;
    location?: string;
    batch?: string;
    expiry?: string | Date | null;
    barcode?: string;
    qrCode?: string;
}

export interface IInventoryUpdatePayload extends Partial<IInventoryPayload> {
    _id?: string;
}

export interface IInventoryStockPayload {
    stockQty?: number;
    quantity?: number;
}

export interface IInventoryBarcodePayload {
    barcode?: string;
    qrCode?: string;
}
