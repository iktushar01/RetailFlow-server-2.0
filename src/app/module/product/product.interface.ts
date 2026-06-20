export interface IProductPayload {
    productName: string;
    category: string;
    brand?: string;
    sku: string;
    description?: string;
    qrCode?: string;
    barcode?: string;
    supplier?: string;
    supplierId?: string | null;
    productImage?: string;
    costPrice?: number;
    sellingPrice?: number;
    price?: number;
    reorderLevel?: number;
    isActive?: boolean;
}

export interface IProductUpdatePayload extends Partial<IProductPayload> {
    _id?: string;
}

export interface IProductParams {
    id: string;
}
