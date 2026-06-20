export interface IWarehouseParams {
    id: string;
}

export interface IWarehousePayload {
    name: string;
    location?: string;
    address?: string;
    capacity?: number;
    isActive?: boolean;
}
