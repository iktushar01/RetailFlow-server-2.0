export interface ISalesPaymentPayload {
    invoiceNo: string;
    saleId?: string;
    customerId?: string | null;
    customerName?: string;
    amount: number;
    paymentMethod?: string;
    status?: string;
    notes?: string;
}

export interface ISalesPaymentUpdatePayload extends Partial<ISalesPaymentPayload> {}
