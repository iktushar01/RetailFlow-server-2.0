export interface IReturnItemPayload {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
}

export interface IReturnPayload {
    invoiceNo: string;
    customerName?: string;
    customerPhone?: string;
    items: IReturnItemPayload[];
    reason: string;
    notes?: string;
}
