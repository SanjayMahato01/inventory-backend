# Inventory Management API — Minu Marketing Pvt Ltd

Backend for the inventory management system. Node.js · Express · TypeScript · Prisma · PostgreSQL.

## Setup

```bash
git clone https://github.com/SanjayMahato01/inventory-backend.git
cd inventory-backend
npm install
cp .env.example .env   
npx prisma generate
npx prisma db push
npm run dev
```

Runs at `http://localhost:5000`.

## Environment Variables

```env
NODE_ENV=development
PORT=5000
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
FRONTEND_URL=http://localhost:3000
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | `prisma generate && tsc` → `dist/` |
| `npm start` | `prisma migrate deploy && node dist/index.js` |
| `npx prisma studio` | Browse the database |
| `npx prisma db push` | Sync schema (dev) |
| `npx prisma migrate deploy` | Apply migrations (prod) |

## API Endpoints

Base URL: `/api`

**Auth**
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET  /auth/me`

**Products**
- `GET    /products`
- `GET    /products/:id`
- `POST   /products`
- `PATCH  /products/:id`
- `DELETE /products/:id`
- `GET    /products/low-stock`
- `GET    /products/low-stock/count`

**Transactions**
- `GET  /transactions`
- `POST /transactions`

**Dashboard**
- `GET /dashboard/summary`
- `GET /dashboard/inventory-trend?days=30`

All routes except register/login require `Authorization: Bearer <token>`.

## Deployment

```bash
npm install
npm run build
npm start
```

Set env vars on your host (`NODE_ENV=production`, strong `JWT_SECRET`, production `DATABASE_URL`, real `FRONTEND_URL`).

`npm start` applies pending migrations automatically, then boots the app.

---

© 2026 Minu Marketing Pvt Ltd