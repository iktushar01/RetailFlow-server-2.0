import { toMongoDoc, toMongoDocs } from "../../utils/mongoCompat";
import { decimalToNumber } from "../../utils/retailFormatters";

export const formatInventoryRecord = (record: {
    id: string;
    productId: string;
    productName: string | null;
    location: string | null;
    stockQty: number;
    batch: string | null;
    expiry: Date | null;
    barcode: string | null;
    qrCode: string | null;
    createdAt: Date;
    updatedAt: Date;
}) => toMongoDoc(record);

export const buildProductCentricInventory = (
    products: Array<{
        id: string;
        productName: string;
        category: string;
        costPrice: { toNumber?: () => number } | number;
        sellingPrice: { toNumber?: () => number } | number;
        reorderLevel: number;
    }>,
    inventoryRows: Array<{
        id: string;
        productId: string;
        productName: string | null;
        location: string | null;
        stockQty: number;
    }>,
) => {
    const byProduct: Record<
        string,
        {
            productId: string;
            productName: string;
            category: string;
            costPrice: number;
            sellingPrice: number;
            reorderLevel: number;
            locations: Array<{ location: string; quantity: number; stockQty: number; inventoryId: string }>;
        }
    > = {};

    products.forEach((product) => {
        byProduct[product.id] = {
            productId: product.id,
            productName: product.productName,
            category: product.category,
            costPrice: decimalToNumber(product.costPrice),
            sellingPrice: decimalToNumber(product.sellingPrice),
            reorderLevel: product.reorderLevel,
            locations: [],
        };
    });

    inventoryRows.forEach((row) => {
        if (!byProduct[row.productId]) {
            byProduct[row.productId] = {
                productId: row.productId,
                productName: row.productName || "Unknown",
                category: "",
                costPrice: 0,
                sellingPrice: 0,
                reorderLevel: 10,
                locations: [],
            };
        }

        byProduct[row.productId].locations.push({
            location: row.location || "Default",
            quantity: row.stockQty,
            stockQty: row.stockQty,
            inventoryId: row.id,
        });
    });

    return Object.values(byProduct).map((entry) => {
        const stockQty = entry.locations.reduce((sum, loc) => sum + loc.quantity, 0);
        return {
            _id: entry.productId,
            ...entry,
            stockQty,
        };
    });
};
