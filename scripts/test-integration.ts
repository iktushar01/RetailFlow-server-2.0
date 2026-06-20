/**
 * Full RetailFlow integration smoke test.
 * Run: pnpm run test:integration
 */
const BASE = process.env.API_BASE_URL || "http://localhost:5000";

type StepResult = { name: string; ok: boolean; status?: number; detail?: string };

const results: StepResult[] = [];

const request = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${BASE}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
};

const step = (name: string, ok: boolean, status?: number, detail?: string) => {
    results.push({ name, ok, status, detail });
    console.log(`${ok ? "PASS" : "FAIL"} ${name}${status ? ` (${status})` : ""}${detail ? ` — ${detail}` : ""}`);
};

const run = async () => {
    console.log("RetailFlow integration smoke test →", BASE, "\n");

    const health = await request("GET", "/");
    step("Health check", health.status === 200, health.status);

    const lists = await Promise.all([
        request("GET", "/products"),
        request("GET", "/suppliers"),
        request("GET", "/warehouses"),
        request("GET", "/inventory"),
        request("GET", "/inventory/products"),
        request("GET", "/purchase-orders"),
        request("GET", "/grn"),
        request("GET", "/sales"),
        request("GET", "/batches"),
    ]);

    const listNames = [
        "GET /products",
        "GET /suppliers",
        "GET /warehouses",
        "GET /inventory",
        "GET /inventory/products",
        "GET /purchase-orders",
        "GET /grn",
        "GET /sales",
        "GET /batches",
    ];
    lists.forEach((r, i) =>
        step(listNames[i], r.status === 200 && Array.isArray(r.data), r.status),
    );

    const supplier = await request("POST", "/suppliers", {
        supplierName: `Smoke Supplier ${Date.now()}`,
        contactPerson: "Test",
        email: `smoke-${Date.now()}@test.com`,
        phone: "1234567890",
        address: "Dhaka",
    });
    step(
        "POST /suppliers",
        supplier.status === 200 && Boolean(supplier.data?._id),
        supplier.status,
    );

    const product = await request("POST", "/products", {
        productName: "Smoke Product",
        category: "Test",
        sku: `SKU-SMOKE-${Date.now()}`,
        supplierId: supplier.data?._id,
        costPrice: 50,
        sellingPrice: 100,
    });
    step(
        "POST /products",
        product.status === 200 && Boolean(product.data?._id),
        product.status,
    );

    const whName = `WH-SMOKE-${Date.now()}`;
    const warehouse = await request("POST", "/warehouses", {
        name: whName,
        location: "Building A",
    });
    step("POST /warehouses", warehouse.status === 200, warehouse.status);

    const po = await request("POST", "/purchase-orders", {
        supplier: supplier.data?._id,
        poNumber: `PO-SMOKE-${Date.now()}`,
        poDate: new Date().toISOString().split("T")[0],
        items: [
            {
                product: product.data?._id,
                productName: "Smoke Product",
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
    step(
        "POST /purchase-orders",
        po.status === 200 && Boolean(po.data?._id),
        po.status,
    );

    await request("PATCH", `/purchase-orders/${po.data?._id}/send`, {});

    const grn = await request("POST", "/grn", {
        grnNumber: `GRN-SMOKE-${Date.now()}`,
        poId: po.data?._id,
        poNumber: po.data?.poNumber,
        supplierId: supplier.data?._id,
        receivedDate: new Date().toISOString().split("T")[0],
        destinationWarehouse: whName,
        items: [
            {
                productId: product.data?._id,
                productName: "Smoke Product",
                orderedQty: 10,
                receivedQty: 5,
                unitPrice: 100,
            },
        ],
    });
    step("POST /grn", grn.status === 200, grn.status, grn.data?.message);

    const inventoryList = await request("GET", "/inventory");
    step(
        "Inventory after GRN",
        inventoryList.status === 200 && Array.isArray(inventoryList.data),
        inventoryList.status,
        `rows=${inventoryList.data?.length ?? 0}`,
    );

    const sale = await request("POST", "/sales", {
        invoiceNo: `INV-SMOKE-${Date.now()}`,
        customerName: "Walk-in Customer",
        items: [
            {
                productId: product.data?._id,
                productName: "Smoke Product",
                quantity: 1,
                unitPrice: 100,
                subtotal: 100,
            },
        ],
        subtotal: 100,
        grandTotal: 100,
        paymentStatus: "Paid",
        amountPaid: 100,
        paymentMethod: "Cash",
    });
    step(
        "POST /sales (POS)",
        sale.status === 200 && Boolean(sale.data?._id),
        sale.status,
    );

    const analytics = await request("GET", "/sales/analytics?period=week");
    step(
        "GET /sales/analytics",
        analytics.status === 200 && analytics.data?.success === true,
        analytics.status,
    );

    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} passed`);
    if (failed.length) {
        process.exit(1);
    }
};

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
