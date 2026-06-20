import {
    GrnStatus,
    PurchaseOrderStatus,
    SupplierPaymentStatus,
} from "../../generated/prisma";

export const toClientPoStatus = (status: PurchaseOrderStatus | string): string => {
    if (status === PurchaseOrderStatus.PartiallyReceived) return "Partially Received";
    if (status === PurchaseOrderStatus.FullyReceived) return "Fully Received";
    return status;
};

export const fromClientPoStatus = (status: string): PurchaseOrderStatus => {
    const map: Record<string, PurchaseOrderStatus> = {
        Draft: PurchaseOrderStatus.Draft,
        Sent: PurchaseOrderStatus.Sent,
        "Partially Received": PurchaseOrderStatus.PartiallyReceived,
        PartiallyReceived: PurchaseOrderStatus.PartiallyReceived,
        "Fully Received": PurchaseOrderStatus.FullyReceived,
        FullyReceived: PurchaseOrderStatus.FullyReceived,
        Cancelled: PurchaseOrderStatus.Cancelled,
    };
    return map[status] ?? PurchaseOrderStatus.Draft;
};

export const toClientGrnStatus = (status: GrnStatus | string): string => status;

export const toClientPaymentStatus = (status: SupplierPaymentStatus | string): string =>
    status;

type PoLineItem = {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: { toNumber?: () => number } | number;
};

type GrnLineItem = {
    productId: string;
    productName: string;
    receivedQty: number;
};

export const buildCumulativeReceivedMap = (
    grns: Array<{ items: GrnLineItem[] }>,
): Record<string, number> => {
    const cumulative: Record<string, number> = {};
    grns.forEach((grn) => {
        grn.items.forEach((item) => {
            cumulative[item.productId] =
                (cumulative[item.productId] || 0) + (item.receivedQty || 0);
        });
    });
    return cumulative;
};

export const buildCumulativeReceivedSummary = (
    grns: Array<{ items: GrnLineItem[] }>,
): Array<{ productId: string; productName: string; totalReceived: number }> => {
    const summary: Record<
        string,
        { productId: string; productName: string; totalReceived: number }
    > = {};

    grns.forEach((grn) => {
        grn.items.forEach((item) => {
            if (!summary[item.productId]) {
                summary[item.productId] = {
                    productId: item.productId,
                    productName: item.productName,
                    totalReceived: 0,
                };
            }
            summary[item.productId].totalReceived += item.receivedQty || 0;
        });
    });

    return Object.values(summary);
};

export const resolvePoStatus = (
    poItems: Array<{ productId: string; quantity: number }>,
    cumulativeReceived: Record<string, number>,
    fallback: PurchaseOrderStatus = PurchaseOrderStatus.Sent,
): PurchaseOrderStatus => {
    let allFullyReceived = true;
    let someReceived = false;

    for (const poItem of poItems) {
        const receivedQty = cumulativeReceived[poItem.productId] || 0;
        if (receivedQty > 0) someReceived = true;
        if (receivedQty < poItem.quantity) allFullyReceived = false;
    }

    if (allFullyReceived && someReceived) return PurchaseOrderStatus.FullyReceived;
    if (someReceived) return PurchaseOrderStatus.PartiallyReceived;
    return fallback;
};

export const calculatePaymentDue = (
    poItems: PoLineItem[],
    cumulativeReceived: Record<string, number>,
    taxPercent: number,
): number => {
    let totalAmount = 0;
    for (const poItem of poItems) {
        const receivedQty = cumulativeReceived[poItem.productId] || 0;
        const unitPrice =
            typeof poItem.unitPrice === "number"
                ? poItem.unitPrice
                : poItem.unitPrice?.toNumber?.() ?? 0;
        totalAmount += receivedQty * unitPrice;
    }
    const taxAmount = (totalAmount * taxPercent) / 100;
    return totalAmount + taxAmount;
};

export const decimalToNumber = (value: { toNumber?: () => number } | number | null | undefined) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    return value.toNumber?.() ?? 0;
};
