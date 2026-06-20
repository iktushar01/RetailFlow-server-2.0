# Express Prisma Auth Server (RetailFlow 2.0 API)

Backend for **RetailFlow-client**: PostgreSQL + Prisma + Express + Better Auth. Replaces the deprecated MongoDB **RetailFlow-server**.

## Features

- RetailFlow domain API at flat root paths (`/products`, `/sales`, `/suppliers`, …)
- Mongo-compatible `_id` responses for the existing React client
- Better Auth (email/password, Google) + JWT access tokens
- Optional retail route protection via `REQUIRE_AUTH` (off by default for local dev)
- Prisma-powered PostgreSQL data layer
- TypeScript-first codebase with Zod validation

See **[MIGRATION.md](./MIGRATION.md)** for auth rules, data migration, and known gaps.

## Running old vs new server

| | Old (deprecated) | New (use this) |
|--|------------------|----------------|
| Folder | `RetailFlow-server/` | `prisma-express-server-template/` |
| Stack | MongoDB + plain Express JS | PostgreSQL + Prisma + TypeScript |
| Start | `cd server && npm run dev` | `pnpm run dev` |
| Default URL | varies | http://localhost:5000 |
| Client env | `VITE_API_BASE_URL=…` | `VITE_API_BASE_URL=http://localhost:5000` |

**RetailFlow-server** is marked deprecated in `RetailFlow-server/DEPRECATED.md`. Keep it for reference only.

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment

Copy `.env.example` to `.env`. Key values:

```env
PORT=5000
DATABASE_URL=your_database_url
BETTER_AUTH_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
REQUIRE_AUTH=false
```

`FRONTEND_URL` must match the Vite client origin for CORS cookies (`http://localhost:5173`).

### 3. Database

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

Optional one-time data import from MongoDB:

```bash
pnpm run migrate:data -- --dry-run
pnpm run migrate:data
```

### 4. Start API

```bash
pnpm run dev
```

API: http://localhost:5000  
Client (separate repo folder): `RetailFlow-client` → `pnpm run dev` → http://localhost:5173

### 5. Integration smoke test

With the API running:

```bash
pnpm run test:integration
```

## API layout

**Retail (client-facing, root paths):**

- `/suppliers`, `/products`, `/purchase-orders`, `/grn`, `/inventory`
- `/payments`, `/suppliers/payments`, `/warehouses`, `/stock-transfers`, `/batches`
- `/sales`, `/customers`, `/discounts`, `/sales-payments`, `/returns`

**Auth / admin (prefixed):**

- `/api/auth/*` — Better Auth
- `/api/v1/auth`, `/api/v1/users`, `/api/v1/admins`

## Production auth

Set `REQUIRE_AUTH=true` to require login for retail write operations. The client must send cookies (`withCredentials: true` — already configured in `RetailFlow-client/src/config/apiConfig.js`).

## Technologies

- Node.js, Express 5, TypeScript, Prisma, PostgreSQL
- Better Auth, Zod, JWT, Nodemailer, Cloudinary

