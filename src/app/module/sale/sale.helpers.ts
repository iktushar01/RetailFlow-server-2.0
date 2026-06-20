import { toMongoDoc } from "../../utils/mongoCompat";
import { decimalToNumber } from "../../utils/retailFormatters";

type SaleWithItems = {
    id: string;
    invoiceNo: string;
    customerId: string | null;
    customerName: string;
    customerPhone: string | null;
    subtotal: { toNumber?: () => number } | number;
    totalDiscount: { toNumber?: () => number } | number;
    tax: { toNumber?: () => number } | number;
    grandTotal: { toNumber?: () => number } | number;
    paymentMethod: string | null;
    paymentStatus: string;
    amountPaid: { toNumber?: () => number } | number;
    status: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
        id: string;
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: { toNumber?: () => number } | number;
        discount: { toNumber?: () => number } | number;
        discountType: string;
        subtotal: { toNumber?: () => number } | number;
        returnedQuantity: number;
    }>;
};

export const formatSaleForClient = (sale: SaleWithItems) => {
    const base = toMongoDoc(sale);
    return {
        ...base,
        items: sale.items.map((item) => {
            const returnedQuantity = item.returnedQuantity || 0;
            const availableForReturn = Math.max(0, item.quantity - returnedQuantity);
            return {
                id: item.id,
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: decimalToNumber(item.unitPrice),
                discount: decimalToNumber(item.discount),
                discountType: item.discountType,
                subtotal: decimalToNumber(item.subtotal),
                returnedQuantity,
                availableForReturn,
            };
        }),
        subtotal: decimalToNumber(sale.subtotal),
        totalDiscount: decimalToNumber(sale.totalDiscount),
        tax: decimalToNumber(sale.tax),
        grandTotal: decimalToNumber(sale.grandTotal),
        amountPaid: decimalToNumber(sale.amountPaid),
    };
};

export const formatSalesForClient = (sales: SaleWithItems[]) =>
    sales.map(formatSaleForClient);
