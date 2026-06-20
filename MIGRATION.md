# RetailFlow Migration Guide

Migration from **RetailFlow-server** (MongoDB + Express JS) to **prisma-express-server-template** (PostgreSQL + Prisma + TypeScript).

## Quick start (local dev)

| App | Command | URL |
|-----|---------|-----|
| New API | `pnpm run dev` in `prisma-express-server-template` | http://localhost:5000 |
| Client | `pnpm run dev` in `RetailFlow-client` | http://localhost:5173 |

Client env (`RetailFlow-client/.env.local`):

```env
VITE_API_BASE_URL=http://localhost:5000
```

Server env (`prisma-express-server-template/.env`):

```env
FRONTEND_URL=http://localhost:5173
REQUIRE_AUTH=false
```

## Data migration

One-time Mongo → Postgres script (run on **empty** retail tables):

```bash
pnpm run migrate:data -- --dry-run   # preview counts
pnpm run migrate:data                # migrate
```

## Authentication

Retail routes use optional auth via `REQUIRE_AUTH`:

| `REQUIRE_AUTH` | Behaviour |
|----------------|-----------|
| `false` (default) | All retail routes work without login — **local dev unchanged** |
| `true` | `POST`, `PUT`, `PATCH`, `DELETE` on retail routes require `checkAuth` (Better Auth session + `accessToken` cookie) |

Auth endpoints (unchanged):

- Better Auth: `/api/auth/*`
- Legacy JWT auth: `/api/v1/auth/*`

When enabling auth in production:

1. Set `REQUIRE_AUTH=true`
2. Set `FRONTEND_URL` to your deployed client origin
3. Log in via Better Auth so cookies are set
4. Client sends cookies automatically (`withCredentials: true` on shared `apiClient`)

## Protected routes (`REQUIRE_AUTH=true`)

All **write** methods on these path prefixes require authentication:

| Prefix | Protected methods |
|--------|-------------------|
| `/suppliers`, `/suppliers/payments` | POST, PUT, PATCH, DELETE |
| `/products` | POST, PUT, PATCH, DELETE |
| `/purchase-orders` | POST, PUT, PATCH, DELETE |
| `/grn` | POST, PUT, PATCH, DELETE |
| `/inventory` | POST, PUT, PATCH, DELETE |
| `/payments` | POST, PUT, PATCH, DELETE |
| `/warehouses` | POST, PUT, PATCH, DELETE |
| `/stock-transfers` | POST |
| `/sales` | POST, PUT, DELETE |
| `/customers` | POST, PUT, DELETE |
| `/discounts` | POST, PUT, PATCH, DELETE |
| `/sales-payments` | POST, PUT, DELETE |
| `/returns` | POST, PATCH, DELETE |
| `/batches` | POST, PUT, DELETE |
| `/upload` | POST |

**Public (always):** all `GET` routes above, plus `/` health check.

**Analytics (always public for now):** `GET /sales/analytics`, `/sales/summary`, `/sales/top-products`, `/sales/date-range`, `/sales/export` — responses use `{ success, data }` wrapper for `utils/api.js`.

## Response shape compatibility

The new server keeps Mongo-style responses for the React client:

- Documents expose `_id` (not `id`)
- List endpoints return raw arrays
- Analytics/report endpoints return `{ success: true, data: ... }`
- Create endpoints return the created document with `_id` where applicable

## Deprecated

**RetailFlow-server** is deprecated. Do not add new features there. Use `prisma-express-server-template` instead.

## Known gaps

| Endpoint / feature | Status | Client reference |
|--------------------|--------|------------------|
| Sales COGS / `totalProfit` in analytics | TODO stub | `SalesReports/services/salesReportsService.js` |
| `GET /sales/export` CSV download | Returns JSON rows only | `salesReportsService.js` |

**Product images:** `POST /upload/image` uploads to Cloudinary (`RetailFlow/images`). Requires `CLOUDINARY_*` env vars on the server. Client: `ProductPages/services/productService.js`.

Run integration smoke test:

```bash
pnpm exec tsx scripts/test-integration.ts
```
