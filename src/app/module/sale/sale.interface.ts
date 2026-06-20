export interface ISaleItemPayload {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: string;
    subtotal?: number;
}

export interface ISalePayload {
    invoiceNo: string;
    customerId?: string | null;
    customerName: string;
    customerPhone?: string | null;
    items: ISaleItemPayload[];
    subtotal: number;
    totalDiscount?: number;
    tax?: number;
    grandTotal: number;
    paymentMethod?: string | null;
    paymentStatus?: string;
    amountPaid?: number;
    status?: string;
    notes?: string;
}

export interface ISaleQuery {
    limit?: number;
    sort?: string;
    status?: string;
}
