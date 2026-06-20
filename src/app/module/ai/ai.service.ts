import { prisma } from "../../lib/prisma";
import { SaleStatus } from "../../../generated/prisma";
import { decimalToNumber } from "../../utils/retailFormatters";

export type ReorderSuggestion = {
    productId: string;
    productName: string;
    sku: string | null;
    category: string | null;
    supplierId: string | null;
    currentStock: number;
    reorderLevel: number;
    monthlySales: number;
    suggestedQty: number;
    priority: "High" | "Medium" | "Low";
    urgencyScore: number;
    costPrice: number;
    totalValue: number;
};

const getReorderSuggestions = async (): Promise<ReorderSuggestion[]> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [products, inventoryRows, saleItems] = await Promise.all([
        prisma.product.findMany(),
        prisma.inventory.findMany(),
        prisma.saleItem.findMany({
            where: {
                sale: {
                    status: SaleStatus.Completed,
                    createdAt: { gte: thirtyDaysAgo },
                },
            },
        }),
    ]);

    const stockByProduct = new Map<string, number>();
    for (const row of inventoryRows) {
        stockByProduct.set(
            row.productId,
            (stockByProduct.get(row.productId) ?? 0) + row.stockQty,
        );
    }

    const monthlySalesByProduct = new Map<string, number>();
    for (const item of saleItems) {
        monthlySalesByProduct.set(
            item.productId,
            (monthlySalesByProduct.get(item.productId) ?? 0) + item.quantity,
        );
    }

    const suggestions: ReorderSuggestion[] = [];

    for (const product of products) {
        const currentStock = stockByProduct.get(product.id) ?? 0;
        const monthlySales = monthlySalesByProduct.get(product.id) ?? 0;
        const reorderLevel = product.reorderLevel || 10;
        const minStockLevel = reorderLevel;
        const safetyStock = Math.ceil(monthlySales * 0.2);
        const suggestedQty = Math.max(monthlySales * 2, minStockLevel * 3, safetyStock * 2);

        let priority: ReorderSuggestion["priority"] = "Low";
        if (currentStock <= minStockLevel * 0.5) priority = "High";
        else if (currentStock <= minStockLevel) priority = "Medium";

        const urgencyScore = (monthlySales * 30) / (currentStock + 1);
        const costPrice = decimalToNumber(product.costPrice);

        if (suggestedQty > 0 && (currentStock < minStockLevel * 2 || urgencyScore > 1)) {
            suggestions.push({
                productId: product.id,
                productName: product.productName,
                sku: product.sku,
                category: product.category,
                supplierId: product.supplierId,
                currentStock,
                reorderLevel,
                monthlySales,
                suggestedQty: Math.ceil(suggestedQty),
                priority,
                urgencyScore,
                costPrice,
                totalValue: Math.ceil(suggestedQty) * costPrice,
            });
        }
    }

    return suggestions.sort((a, b) => b.urgencyScore - a.urgencyScore);
};

const naturalLanguageQuery = async (query: string) => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
        return { answer: "Please enter a question about sales or inventory.", data: null };
    }

    if (normalized.includes("low stock") || normalized.includes("reorder")) {
        const suggestions = await getReorderSuggestions();
        return {
            answer: `Found ${suggestions.length} products that may need reordering.`,
            data: suggestions.slice(0, 10),
        };
    }

    if (normalized.includes("sales") || normalized.includes("revenue")) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sales = await prisma.sale.findMany({
            where: { status: SaleStatus.Completed, createdAt: { gte: thirtyDaysAgo } },
        });
        const total = sales.reduce((sum, sale) => sum + decimalToNumber(sale.grandTotal), 0);
        return {
            answer: `Completed sales in the last 30 days: ${sales.length} orders, total revenue ${total.toFixed(2)}.`,
            data: { totalSales: sales.length, totalRevenue: total },
        };
    }

    return {
        answer: 'Try: "low stock", "sales last month", or open Analytics → Auto Reorder.',
        data: null,
    };
};

export const AiService = {
    getReorderSuggestions,
    naturalLanguageQuery,
};
