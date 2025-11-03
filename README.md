# MyToko — Next.js + Supabase E‑Commerce

A minimalist e‑commerce app built with Next.js 16 (App Router), TypeScript, Tailwind, and Supabase for auth, database, RPCs, and Storage.

## Features

- Product Catalog with client filtering, category, price range, and sorting
- Global Navbar search synced with Catalog ("mouse" shows only mouse products)
- Cart, Checkout (10% tax + Rp 10.000 shipping), Order History
- Reviews with per‑user Helpful toggle
- Wishlist (DB + local), green hearts with "Added!" state
- Invoice view with PDF generation; status badges consistent with dashboard
- Dashboard with actionable cards (Active Orders, Reviews To Write, Wishlist, etc.)
- Admin Dashboard (gated via `profiles.is_admin`)
  - KPIs (revenue/orders/customers/growth)
  - Sales Overview + Revenue Trend charts (IDR formatting)
  - Customer Orders with status updates (via secure API)
  - Product Management CRUD with stock editing and image upload to Supabase Storage
  - Secure server API for product edits (admin‑only, validated)

## Tech Stack

- Next.js 16 (App Router), React 18, TypeScript
- Tailwind CSS, shadcn/ui atoms
- Supabase: Postgres + Auth + Storage + RPC
- Recharts for admin charts, @react-pdf/renderer for invoices

## Quick start

1) Install dependencies

```bash
npm install
```

2) Configure environment

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3) Run the app

```bash
npm run dev
```

Go to http://localhost:3000

4) Build for production (optional)

```bash
npm run build
npm start
```

## Database setup (Supabase)

Run these SQL scripts in Supabase SQL editor (or convert them to CLI migrations):

- Storage (public bucket + policies): `supabase/products_storage.sql`
  - Creates public `products` bucket
  - Public read; admin‑only insert/update/delete to `storage.objects`
- Reviews RLS: `supabase/reviews_insert_policies.sql`
  - Ensures `reviews.user_id` is set and inserts are per‑user
- Orders RPCs/policies (included in supabase/ directory)
  - `orders_create_rpc.sql`, `orders_add_order_number.sql`, `orders_policies.sql`
- Reviews helpful RPC: `reviews_helpful_rpc.sql`
- Products public read: `products_public_read.sql`

### Keep `in_stock` DB‑managed

We do NOT write `in_stock` from the app. Choose one approach in DB:

- Generated column (clean):
  - `ALTER TABLE public.products ADD COLUMN in_stock boolean GENERATED ALWAYS AS ((stock > 0)) STORED;`
- Or trigger‑based (non‑destructive):
  - Create function to set `NEW.in_stock := coalesce(NEW.stock,0) > 0;` and add a BEFORE INSERT/UPDATE OF stock trigger.

## Admin security

- Admin gate: `profiles.is_admin = true`
- Changing order status: `PATCH /api/orders/[id]/status` → calls `set_order_status` RPC. Requires admin.
- Editing products: `PATCH /api/products/[id]` (server route)
  - Auth + admin check
  - Whitelisted fields: `name`, `long_description`, `category`, `stock`, `image`
  - Blocks: `in_stock`, `price`, `original_price`, `rating`, `reviews`
  - Validates string lengths, category enum, stock range, image URL
- Product images: Supabase Storage bucket `products` with public read and admin‑only writes (see SQL above)

## Favicon / icons

- Put your favicon at `app/favicon.ico` (preferred) or `public/favicon.ico`
- Optional: `app/icon.png` (512×512), `app/apple-touch-icon.png` (180×180)

## Troubleshooting

- Favicon not showing: ensure `app/favicon.ico` is a file (not a folder), then hard refresh (Ctrl+F5).
- Navbar search didn’t filter Catalog: fixed—Catalog syncs its state when `?search=` changes.
- Admin edit error “in_stock can only be updated to DEFAULT”: fixed—app never writes `in_stock`; ensure DB has generated/trigger‑managed in_stock.
- Storage SQL errors
  - `CREATE POLICY IF NOT EXISTS` not supported → script uses conditional DO blocks with `pg_policies` checks instead.
  - `must be owner of table objects` → we don’t ALTER `storage.objects`; only create bucket + policies.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm start` — run production build
- `npm run lint` — optional (set up ESLint if needed)

## Project structure

- `app/` — Next.js App Router pages/routes
- `components/` — UI and feature components
- `lib/` — contexts, utilities, and data helpers
- `supabase/` — SQL scripts for schema/RLS/RPC/Storage

## License

MIT
