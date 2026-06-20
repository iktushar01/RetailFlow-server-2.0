export interface ISupplierPaymentUpdatePayload {
    amountDue?: number;
    amountPaid?: number;
    status?: string;
    dueDate?: string | Date | null;
    paidAt?: string | Date | null;
    notes?: string;
    _id?: string;
}

export interface ISupplierPaymentPayload {
    poId: string;
    supplierId: string;
    amountDue: number;
    amountPaid?: number;
    grnId?: string | null;
    poNumber?: string | null;
    grnNumber?: string | null;
    status?: string;
    dueDate?: string | Date | null;
}
