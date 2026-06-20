import { toMongoDoc } from "../../utils/mongoCompat";
import { toClientGrnStatus, toClientPoStatus } from "../../utils/retailFormatters";

type GrnWithItems = {
    id: string;
    grnNumber: string;
    poId: string;
    poNumber: string | null;
    supplierId: string;
    receivedDate: Date;
    destinationWarehouseName: string | null;
    status: string;
    notes: string | null;
    approvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
        id: string;
        productId: string;
        productName: string;
        orderedQty: number;
        receivedQty: number;
        batch: string | null;
        expiry: Date | null;
        unitPrice: { toNumber?: () => number } | number;
    }>;
};

export const formatGrnForClient = (grn: GrnWithItems) => {
    const base = toMongoDoc(grn);
    return {
        ...base,
        status: toClientGrnStatus(grn.status),
        destinationWarehouse: grn.destinationWarehouseName,
        items: grn.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName,
            orderedQty: item.orderedQty,
            receivedQty: item.receivedQty,
            batch: item.batch,
            expiry: item.expiry ? item.expiry.toISOString() : null,
            unitPrice:
                typeof item.unitPrice === "number"
                    ? item.unitPrice
                    : item.unitPrice?.toNumber?.() ?? 0,
        })),
    };
};

export const formatPoForClient = (po: {
    id: string;
    poNumber: string;
    supplierId: string;
    poDate: Date;
    expectedDeliveryDate: Date | null;
    status: string;
    notes: string | null;
    tax: { toNumber?: () => number } | number;
    subtotal: { toNumber?: () => number } | number;
    taxAmount: { toNumber?: () => number } | number;
    total: { toNumber?: () => number } | number;
    lastGrnDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
        id?: string;
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: { toNumber?: () => number } | number;
        subtotal: { toNumber?: () => number } | number;
    }>;
}) => {
    const base = toMongoDoc(po);
    return {
        ...base,
        supplier: po.supplierId,
        status: toClientPoStatus(po.status),
        items: po.items.map((item) => ({
            id: item.id,
            product: item.productId,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            orderedQty: item.quantity,
            unitPrice:
                typeof item.unitPrice === "number"
                    ? item.unitPrice
                    : item.unitPrice?.toNumber?.() ?? 0,
            subtotal:
                typeof item.subtotal === "number"
                    ? item.subtotal
                    : item.subtotal?.toNumber?.() ?? 0,
        })),
    };
};
