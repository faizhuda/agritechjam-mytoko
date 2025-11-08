<div align="center">

# 🛒 MyToko

### Modern E-Commerce Platform Built for Speed & Security

*Enterprise-grade shopping experience powered by Next.js 16, TypeScript, Tailwind CSS, and Supabase*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/) 
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/) 
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) 
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3fcf8e?logo=supabase&logoColor=white)](https://supabase.com/) 
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#-license)

[Features](#-features) • [Quick Start](#-quick-start) • [Tech Stack](#-tech-stack) • [Database Setup](#-database-setup) • [Security](#-security)

---

</div>

## ✨ Features

### 🛍️ Customer Experience
- **Smart Product Catalog** — Real-time filtering by category, price range, and sorting with instant search sync
- **Shopping Cart & Checkout** — Seamless checkout with 10% tax + Rp 10,000 shipping calculation
- **Order Management** — Complete purchase history with real-time status tracking
- **Reviews & Ratings** — Write reviews, rate products, and mark helpful reviews
- **Wishlist System** — Save favorites with persistent storage and instant visual feedback
- **PDF Invoices** — Professional invoice generation with download support

### 👨‍💼 Admin Dashboard
- **Advanced Analytics** — Revenue tracking, order metrics, customer insights, and growth trends
- **Visual Reports** — Interactive charts for sales overview and revenue trends (IDR formatted)
- **Order Management** — Real-time order status updates with secure API validation
- **Product CRUD** — Full product management with stock control and image uploads to Supabase Storage
- **Role-Based Access** — Admin-gated features with RLS policies and server-side validation

## 🚀 Tech Stack

<table>
<tr>
<td>

**Frontend**
- ⚡ Next.js 16 (App Router)
- ⚛️ React 18
- 📘 TypeScript
- 🎨 Tailwind CSS + shadcn/ui
- 📊 Recharts
- 📄 @react-pdf/renderer

</td>
<td>

**Backend**
- 🗄️ Supabase PostgreSQL
- 🔐 Supabase Auth
- 🔒 Row Level Security (RLS)
- 📦 Supabase Storage
- ⚙️ Remote Procedure Calls (RPC)
- 🔄 Realtime subscriptions

</td>
</tr>
</table>

### 🏗️ Architecture Highlights

- **Server-First Rendering** — Next.js App Router with React Server Components
- **Type-Safe Database** — TypeScript interfaces for all Supabase queries
- **Secure Auth Flow** — Email/password authentication with RLS policies
- **Image Management** — Supabase Storage with public read, admin-only writes
- **Real-time Updates** — Live data sync for orders, products, and reviews

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- A Supabase account and project

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/faizhuda/agritechjam-mytoko.git
cd agritechjam-mytoko

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp env.example .env.local
# Edit .env.local with your Supabase credentials
```

### Environment Configuration

Create `.env.local` with the following variables:

```bash
<!--
  Comprehensive README for MyToko
  - Updated: 2025-11-08
  - Author: repo maintainers
  This file aims to be a single source of truth for developers onboarding onto the project.
-->

# 🛒 MyToko (agritechjam-mytoko)

Modern e‑commerce reference app built with Next.js 16, TypeScript, Tailwind CSS and Supabase.

Badges: Next.js 16 · React 18 · TypeScript · Supabase · Tailwind

Table of contents
- Features
- Quick start (dev)
- Environment & configuration
- Development workflow
- Database & Supabase
- Styling & layout notes (compact/site-content)
- Charts notes (Recharts)
- Testing, linting & formatting
- Deploy & production notes
- Troubleshooting
- Contributing
- License

---

## ✨ Highlights / Feature overview

- Customer UX: product catalog, cart, checkout, wishlist, reviews & ratings, invoices (PDF)
- Admin: analytics dashboard (sales, revenue trends), product CRUD, order management, role-based admin flows
- Real-time: Pub/Sub for orders/reviews using Supabase realtime
- Security: Supabase Auth + Row-Level Security (RLS) + server-side validation for admin endpoints

## 🚀 Quick start (developer)

Prerequisites
- Node.js 18+ (LTS)
- npm (or pnpm/yarn) installed
- Supabase project (for database, auth, storage)

Clone and install

```powershell
git clone https://github.com/faizhuda/agritechjam-mytoko.git
cd agritechjam-mytoko
npm install
```

Environment
- Copy the example env and fill values from your Supabase project:

```powershell
copy env.example .env.local
# then edit .env.local with your SUPABASE variables
```

Minimum required variables (in `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Optional: service role for admin scripts (keep secret)
SUPABASE_SERVICE_ROLE_KEY=
```

Run development server

```powershell
npm run dev
```

Open http://localhost:3000

Build for production

```powershell
npm run build
npm start
```

---

## 🗄️ Database & Supabase

Project contains SQL scripts and helpers under the `supabase/` folder.

- Use the Supabase SQL Editor to run listed scripts (table schemas, RLS, RPCs).
- There's a collection of maintenance / migration scripts in `supabase/` (look before running).

Quick (Windows) apply script (if present in your workspace):

```powershell
./supabase/apply-migrations.ps1
```

Important scripts/examples (see `supabase/` folder):
- `products_public_read.sql`, `products_storage.sql` — storage & read policies
- `orders_create_rpc.sql`, `orders_set_status_rpc.sql` — secure RPCs for order flow
- `product_reviews_public_read.sql`, `reviews_helpful_rpc.sql` — reviews & helpful toggles

Security
- RLS is enabled for sensitive tables; admin-only operations must be performed server-side or via RPCs authenticated with appropriate roles.
- Keep `SUPABASE_SERVICE_ROLE_KEY` out of client code. Only use it on server side or in CI secrets.

---

## 🎨 Styling & layout notes

- Styling is built with Tailwind CSS and a small set of global CSS variables in `app/globals.css`.
- There is an intentional density / compact mode implemented by scoping tighter utility overrides to `.site-content`. The `Navbar` and `Footer` remain unchanged so the app chrome keeps consistent sizing.

Where to change compact/density:
- `app/globals.css` — contains `.site-content` overrides (smaller font sizes, reduced paddings) applied to `<main className="site-content">` in `app/layout.tsx`.

Tailwind notes
- If you add CSS rules targeting utility class names, avoid raw selectors like `.gap-2.5` (Turbopack/CSS parser may error). Use attribute selectors instead (example used in the project):

```css
[class*="gap-2.5"] { /* ... */ }
```

---

## 📊 Charts (Recharts) — important notes

- Charts live in the Admin dashboard (`app/admin/page.tsx`) and use Recharts `ResponsiveContainer` with `BarChart` and `LineChart`.
- Y-axis labels required reserving left space: we compute a responsive `yAxisWidth` in the dashboard which combines viewport percentage and an estimate of the formatted max value. This prevents clipping on mobile and keeps both charts visually aligned.
- Tick formatting: we use `Intl.NumberFormat('id-ID')` and `formatIDR()` helper for currency to show Indonesian locale separators.

If you adjust chart styles, ensure:
- `YAxis.width` is large enough for formatted labels (or use a ResizeObserver / measureText for pixel-perfect sizing)
- `axisLine` and `tickLine` can be toggled to show/hide axis strokes. The project uses subtle gray strokes for axis lines to keep visuals clean.

---

## 🧪 Testing, linting & formatting

- Linting (ESLint):

```powershell
npm run lint
```

- Formatting (Prettier if included): run locally via your editor or the project's npm script if present.

- Unit/E2E tests: none are included by default — consider adding Jest/Playwright for critical flows.

---

## ⚙️ Development workflow & commands

- Start dev server: `npm run dev` (Turbopack)
- Build: `npm run build`
- Start (production): `npm start`
- Lint: `npm run lint`

Recommended editor setup
- VSCode with: ESLint, TypeScript, Tailwind CSS IntelliSense, Prettier (optional)

---

## � Deployment

- The app is well-suited for Vercel / Supabase hosting. Typical steps:
  1. Push to GitHub
  2. Configure Vercel project and set environment variables
  3. Add Supabase service key to Vercel's secrets only if running server-side jobs

- Notes for production:
  - Ensure RLS policies are correct and service role keys are not exposed.
  - Configure Supabase bucket CORS and image caching settings.

---

## 🐛 Troubleshooting (common issues)

- CSS parse error mentioning `.gap-2.5` or "Unexpected token Number": avoid unescaped utility selectors; prefer attribute selectors such as `[class*="gap-2.5"]`.
- Chart labels clipped on mobile: increase `YAxis.width` or enable the responsive width logic in `app/admin/page.tsx`. Consider using ResizeObserver or canvas `measureText` for perfect measurements.
- Admin operations failing:
  - Verify `profiles.is_admin` is true for the admin user in Supabase
  - Check relevant RLS SQL in `supabase/`
  - For uploads, ensure the `products` bucket exists and policies are correct

---

## 🙌 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-change`
3. Commit, push, open a PR

Coding guidelines
- Keep changes TypeScript-first and add small unit tests where possible
- Update README or docs when adding new environment variables or SQL migrations

---

## 📝 Where to look next in this repo

- `app/layout.tsx` — site shell (Navbar / Footer / main with `site-content`)
- `app/globals.css` — global variables and density overrides
- `app/admin/page.tsx` — admin charts and Y-axis responsive logic
- `components/` — shared UI pieces (notification center, modals, inputs)
- `lib/supabase/` — supabase client helpers
- `supabase/` — SQL scripts and maintenance helpers

---

## License

MIT — see the LICENSE file in this repository.

---

If you'd like this README translated to Indonesian or expanded with a short developer onboarding checklist (screenshots, local seeding commands), tell me which sections to add and I'll extend it.
