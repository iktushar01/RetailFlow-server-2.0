export interface ISupplierPaymentUpdatePayload {
    amountDue?: number;
    amountPaid?: number;
    status?: string;
    dueDate?: string | Date | null;
    paidAt?: string | Date | null;
    notes?: string;
    _id?: string;
}
