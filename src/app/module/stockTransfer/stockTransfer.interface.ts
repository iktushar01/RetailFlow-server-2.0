export interface IStockTransferPayload {
    productId: string;
    productName?: string;
    sourceWarehouse: string;
    destinationWarehouse: string;
    quantity: number;
}
