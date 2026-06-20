export interface ISupplierPayload {
    supplierName: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    notes?: string;
    status?: string;
}

export interface ISupplierUpdatePayload extends Partial<ISupplierPayload> {}

export interface ISupplierParams {
    id: string;
}
