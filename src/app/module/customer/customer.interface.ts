export interface ICustomerPayload {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
}

export interface ICustomerUpdatePayload extends Partial<ICustomerPayload> {}
