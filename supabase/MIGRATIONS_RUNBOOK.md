## Supabase migrations runbook

This project ships SQL scripts under `supabase/` for policies, RPCs, and helpers. Run them against your Supabase project in the order below. They are designed to be idempotent where possible; if you see "already exists" warnings, they can usually be ignored.

### Prerequisites

- Supabase project created
- Supabase Realtime enabled on the following tables (recommended): `products`, `cart_items`, `orders`, `reviews`
- Supabase CLI installed: https://supabase.com/docs/guides/cli

### Option A (recommended): Run via Dashboard SQL editor (no tooling needed)

1) Open your Supabase project → SQL Editor
2) Open each file in this order and paste into the editor, then Run:
	- `products_storage.sql`
	- `products_public_read.sql`
	- `products_admin_policies.sql`
	- `profiles_extra_fields.sql`
	- `profiles_shipping_fields.sql`
	- `reviews_dedupe_then_unique.sql`
	- `reviews_unique_per_user.sql`
	- `reviews_public_read.sql`
	- `reviews_insert_policies.sql`
	- `reviews_helpful_rpc.sql`
	- `orders_add_order_number.sql`
	- `orders_create_rpc.sql`
	- `orders_policies.sql`
	- `orders_admin_read.sql`
	- `wishlist_admin.sql`
	- `idr_migration.sql`

If a statement reports "already exists", it’s typically safe to continue.

### Option B: Use the PowerShell helper against your cloud DB

1) Get your Database URL (Project Settings → Database → Connection string → URI). It looks like:

```
postgresql://postgres:<PASSWORD>@db.<hash>.supabase.co:5432/postgres
```

2) Run the helper (requires `psql` in PATH):

```powershell
./supabase/apply-migrations.ps1 -DbUrl "postgresql://postgres:<PASSWORD>@db.<hash>.supabase.co:5432/postgres"
```

The script stops on errors; benign "already exists" messages are okay.

### Option C: Use Supabase CLI (advanced)

You can also run via the Supabase CLI. Note that without remote DB configuration, it may target a local Docker DB.

```powershell
supabase login
supabase link --project-ref <your-project-ref>
./supabase/apply-migrations.ps1 -ProjectRef <your-project-ref>
```

Ensure your CLI is configured to execute against the remote DB if you choose this path.

### Option B: Run each SQL file manually

Execute these scripts in order using the Supabase SQL editor or `supabase db execute --file <path>`:

1. `supabase/products_storage.sql` — Storage bucket and policies for product images (public read; admin-only writes)
2. `supabase/products_public_read.sql` — Public read policies for products
3. `supabase/products_admin_policies.sql` — Admin-only write policies for products
4. `supabase/profiles_extra_fields.sql` — Adds profile fields used at checkout (first/last name, phone, etc.)
5. `supabase/profiles_shipping_fields.sql` — Additional shipping fields
6. `supabase/reviews_dedupe_then_unique.sql` — Deduplicate existing duplicates before adding unique constraint
7. `supabase/reviews_unique_per_user.sql` — One review per user per product
8. `supabase/reviews_public_read.sql` — Public read for reviews
9. `supabase/reviews_insert_policies.sql` — Insert/update/delete policies for reviews (auth-required)
10. `supabase/reviews_helpful_rpc.sql` — RPC to toggle helpful
11. `supabase/orders_add_order_number.sql` — Adds human-friendly order number
12. `supabase/orders_create_rpc.sql` — RPC to create orders and decrement stock atomically
13. `supabase/orders_policies.sql` — RLS policies for orders
14. `supabase/orders_admin_read.sql` — Admin read endpoints/views
15. `supabase/wishlist_admin.sql` — Wishlist admin helpers/policies if applicable
16. `supabase/idr_migration.sql` — Optional IDR-related helpers/data

Notes:
- Run 6 before 7 to prevent unique constraint failures.
- If any script touches `storage.objects`, you must be owner; scripts are written to avoid altering system tables.
- Re-running may produce benign "already exists" messages.

### Verifications

- Products: Public can select; only admins can insert/update/delete.
- Reviews: Only signed-in users can insert; one review per user-product; helpful toggling works.
- Orders: Users can see their own orders; admins can see all orders and change status via RPC.
- Storage: Images load publicly; only admins can modify.

### Troubleshooting

- Missing environment variables: ensure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Admin APIs failing: ensure `profiles.is_admin = true` for your admin user.
- Realtime not firing: enable Realtime for the affected tables in Supabase dashboard.
