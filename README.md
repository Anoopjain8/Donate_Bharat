# Donate Bharat

A multi-faith payment tracking platform for India. Track every rupee — donations, municipal taxes, vehicle challans, utility bills, fines, and more — with full transparency on where money goes.

## Features

- **Three roles:** Payer (track payments), Payee (receive/manage payments), Admin (verify orgs, manage users, audit).
- **Payer dashboard:** bill/receipt tracking with category-wise breakdown, filters, and CSV export.
- **Payee dashboard:** incoming bills review, verified receipts, payment analytics.
- **Browse payees:** search/filter by religion and type (Temple, Church, Mosque, Gurdwara, Charity, NGO, Government Dept).
- **Online payments:** Razorpay (UPI, cards, net banking, wallets) with signature verification and webhooks. Runs in a safe **demo mode** when no real keys are configured.
- **Receipt uploads:** PDFs and images, up to 5 files per bill, stored on AWS S3 or local disk.
- **Auto receipts:** online payments generate a PDF receipt automatically.
- **Transparency portal:** public, per-organization totals.
- **Reports:** Excel / PDF / CSV generation with password-protected share links and expiry.
- **Security:** bcrypt passwords, JWT access + rotating httpOnly refresh-token family, per-IP rate limiting, Helmet headers, input validation, full audit log.

## Tech Stack

- **Backend:** Node.js, Express 4, Mongoose, JWT + refresh-token rotation, bcrypt
- **Frontend:** React 18 (Vite), React Router, Axios, React Hot Toast
- **Payments:** Razorpay SDK + webhook verification (demo fallback)
- **Storage:** AWS S3 (presigned URLs) with local-disk fallback
- **Reports:** ExcelJS, PDFKit
- **Tests:** Jest + Supertest (integration suite)
- **Lint:** ESLint

## Getting Started

### Prerequisites

- Node.js **18+**
- MongoDB Atlas (or local MongoDB)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # edit MONGODB_URI and JWT secrets
npm run dev            # http://localhost:5000
```

Required `.env` values: `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`. The rest have sensible defaults.

> Note: if your ISP/router DNS can't resolve MongoDB Atlas SRV records, the app auto-falls back to public DNS (`8.8.8.8` / `1.1.1.1`) for the DB connection.

### Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173 (proxies /api to :5000)
```

### Seed the database (recommended)

```bash
cd backend
npm run seed
```

Seeds 8 demo users (password `password123`), 8 organizations, 9 categories, ~80 payments, and ~125 bills. Wipes the database first.

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@donatebharat.in` | `Admin@123456` |
| Payer | `arjun@demo.com` | `password123` |
| Payee | `gurudwara@demo.com` | `password123` |

## Testing

```bash
cd backend
npm test        # Jest integration suite (19 tests) — uses the DB specified in tests/setup.js
npm run lint
```

Frontend:

```bash
cd frontend
npm run build
npx eslint src
```

## Payments (Razorpay)

- Get test keys at [dashboard.razorpay.com](https://dashboard.razorpay.com).
- Add `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` to `backend/.env`.
- Order creation enforces ownership + pending-state checks; verification validates the payment amount before marking paid; the webhook re-validates against the order amount.
- Without real keys the API returns simulated orders (`demo: true`) so the full flow works locally.

## Storage (AWS S3 or local)

Set `STORAGE_DRIVER=s3` and `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_BUCKET_NAME` (optionally `AWS_ENDPOINT` for MinIO). With `STORAGE_DRIVER=local` files are written under `backend/uploads`. Private files are served via short-lived signed URLs (`SIGNED_URL_TTL`).

## Docker

`docker-compose.yml` at the repo root runs the API + frontend containers (frontend served over the API's `/api` proxy). `MONGODB_URI` must point at a reachable MongoDB (Atlas or a `mongodb` service).

## Project Layout

```
backend/
  src/
    config/     env validation, db connection, admin bootstrap
    models/     User, Organization, Payment, Bill, Category, RefreshToken, AuditLog, ReportShare
    middleware/ auth (JWT+RBA), validation, rate limiting, upload, error handling
    routes/     auth, files, organizations, categories, payments, bills, reports, admin
    controllers/ per-resource handlers
    services/   storage, email, razorpay, receipt PDF, reports
  tests/        Jest integration tests
  seed.js       demo data seeder
frontend/
  src/
    pages/      all route pages (payer, payee, admin)
    components/ Navbar, ProtectedRoute
    context/    AuthContext
    services/   axios client + API modules
```
