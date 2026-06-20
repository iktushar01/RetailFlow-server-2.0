/**
 * Manual smoke test for Phase 3 retail endpoints.
 * Run: npx tsx scripts/test-phase3.ts
 */
import { prisma } from "../src/app/lib/prisma";

const BASE = process.env.API_BASE_URL || "http://localhost:5000";

const request = async (
    method: string,
    path: string,
    body?: unknown,
) => {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
};

const run = async () => {
    console.log("Phase 3 smoke test against", BASE);

    const supplier = await request("POST", "/suppliers", {
        supplierName: "Phase3 Supplier",
        contactPerson: "Alice",
        email: "phase3@test.com",
        phone: "1234567890",
        address: "Dhaka",
    });
    console.log("POST /suppliers", supplier.status, supplier.data?._id);

    const product = await request("POST", "/products", {
        productName: "Phase3 Product",
        category: "Electronics",
        brand: "BrandX",
        sku: `SKU-${Date.now()}`,
        qrCode: `QR-${Date.now()}`,
        supplier: "Phase3 Supplier",
        supplierId: supplier.data?._id,
    });
    console.log("POST /products", product.status, product.data?._id);

    const whName = `WH-${Date.now()}`;
    const warehouse = await request("POST", "/warehouses", {
        name: whName,
        location: "Building A",
    });
    console.log("POST /warehouses", warehouse.status);

    const po = await request("POST", "/purchase-orders", {
        supplier: supplier.data?._id,
        poNumber: `PO-${Date.now()}`,
        poDate: new Date().toISOString().split("T")[0],
        items: [
            {
                product: product.data?._id,
                productName: "Phase3 Product",
                quantity: 10,
                unitPrice: 100,
                subtotal: 1000,
            },
        ],
        tax: 5,
        subtotal: 1000,
        taxAmount: 50,
        total: 1050,
    });
    console.log("POST /purchase-orders", po.status, po.data?._id);

    const send = await request("PATCH", `/purchase-orders/${po.data?._id}/send`, {
        status: "Sent",
    });
    console.log("PATCH /purchase-orders/:id/send", send.status, send.data?.message);

    const grn = await request("POST", "/grn", {
        grnNumber: `GRN-${Date.now()}`,
        poId: po.data?._id,
        poNumber: po.data?.poNumber,
        supplierId: supplier.data?._id,
        receivedDate: new Date().toISOString().split("T")[0],
        destinationWarehouse: whName,
        items: [
            {
                productId: product.data?._id,
                productName: "Phase3 Product",
                orderedQty: 10,
                receivedQty: 5,
                unitPrice: 100,
            },
        ],
    });
    console.log("POST /grn", grn.status, grn.data?.message, grn.data?.poStatus);

    const cumulative = await request(
        "GET",
        `/grn/po/${po.data?._id}/received`,
    );
    console.log("GET /grn/po/:poId/received", cumulative.status, cumulative.data);

    const payments = await request("GET", "/payments");
    console.log("GET /payments", payments.status, Array.isArray(payments.data) ? payments.data.length : payments.data);

    const warehouses = await request("GET", "/warehouses");
    console.log(
        "GET /warehouses",
        warehouses.status,
        warehouses.data?.[0]?.totalProducts,
    );

    const srcWh = `ST-SRC-${Date.now()}`;
    const dstWh = `ST-DST-${Date.now()}`;
    await request("POST", "/warehouses", { name: srcWh });
    await request("POST", "/warehouses", { name: dstWh });
    await prisma.inventory.create({
        data: {
            productId: product.data?._id,
            productName: product.data?.productName,
            stockQty: 10,
            location: srcWh,
        },
    });

    const transfer = await request("POST", "/stock-transfers", {
        productId: product.data?._id,
        sourceWarehouse: srcWh,
        destinationWarehouse: dstWh,
        quantity: 2,
    });
    console.log("POST /stock-transfers", transfer.status, transfer.data?.message);

    const inventory = await prisma.inventory.findFirst({
        where: { productId: product.data?._id, location: srcWh },
    });
    if (inventory) {
        const barcode = await request("PATCH", `/inventory/${inventory.id}/barcode`, {
            barcode: `BC-${Date.now()}`,
        });
        console.log("PATCH /inventory/:id/barcode", barcode.status, barcode.data?.message);
    }

    if (payments.data?.[0]?._id) {
        const paymentUpdate = await request(
            "PUT",
            `/payments/${payments.data[0]._id}`,
            {
                amountDue: payments.data[0].amountDue,
                amountPaid: payments.data[0].amountDue,
            },
        );
        console.log(
            "PUT /payments/:id",
            paymentUpdate.status,
            paymentUpdate.data?.message,
        );
    }

    await prisma.$disconnect();
    console.log("Done.");
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
