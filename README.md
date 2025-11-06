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
# Required - Get these from your Supabase project settings
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional - For admin APIs only
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser 🎉

### Production Build

```bash
npm run build
npm start
```

## 🗄️ Database Setup

### Quick Setup (Windows)

```powershell
# Run all migrations automatically
./supabase/apply-migrations.ps1
```

### Manual Setup

Execute these SQL scripts in your Supabase SQL Editor:

| Script | Purpose |
|--------|---------|
| `products_storage.sql` | Create public `products` bucket with admin-only writes |
| `reviews_insert_policies.sql` | RLS policies for user reviews |
| `orders_create_rpc.sql` | Secure order creation RPC |
| `orders_policies.sql` | Order access policies |
| `reviews_helpful_rpc.sql` | Toggle review helpful function |
| `products_public_read.sql` | Public product read access |

### Enable Realtime

For live updates, enable Realtime replication in your Supabase project for these tables:
- `products`
- `cart_items`
- `orders`
- `reviews`

> 💡 **Tip:** Check `supabase/MIGRATIONS_RUNBOOK.md` for detailed migration guide

## 🔒 Security

### Admin APIs

All admin operations use server-side validation with authentication and role checks.

#### `PATCH /api/orders/[id]/status`
Update order status through secure RPC.

```json
{
  "status": "pending|paid|shipped|delivered|cancelled"
}
```

**Returns:** `{ ok: true }` or error message

#### `PATCH /api/products/[id]`
Edit product details with field validation.

**✅ Allowed Fields:**
- `name`, `long_description`, `category`, `stock`, `image`

**❌ Protected Fields:**
- `in_stock`, `price`, `original_price`, `rating`, `reviews`

**Validations:**
- String length limits
- Category enum validation
- Stock range checks
- Image URL format

### Role-Based Access Control

- **Admin Gate:** `profiles.is_admin = true`
- **RLS Policies:** Row-level security on all tables
- **API Validation:** Server-side auth checks on all mutations
- **Storage Security:** Public read, admin-only writes

### Database Managed Fields

`in_stock` is automatically managed by the database:

```sql
-- Option 1: Generated column (recommended)
ALTER TABLE products ADD COLUMN in_stock boolean 
  GENERATED ALWAYS AS ((stock > 0)) STORED;

-- Option 2: Trigger-based
CREATE FUNCTION update_in_stock() ...
CREATE TRIGGER sync_in_stock BEFORE INSERT OR UPDATE ...
```

## 📁 Project Structure

```
agritechjam-mytoko/
├── app/                    # Next.js App Router pages & API routes
│   ├── admin/             # Admin dashboard pages
│   ├── api/               # Server-side API endpoints
│   ├── auth/              # Authentication pages
│   └── ...                # Customer-facing pages
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── catalog/           # Product catalog components
│   └── home/              # Homepage components
├── lib/                   # Utilities & helpers
│   ├── db/                # Database query functions
│   └── supabase/          # Supabase client setup
└── public/                # Static assets
```

## 🛠️ Development Commands

```bash
npm run dev      # Start development server (Turbopack)
npm run build    # Build for production
npm start        # Run production server
npm run lint     # Run ESLint (optional)
```

## 🐛 Troubleshooting

<details>
<summary><b>Favicon not showing</b></summary>

Ensure `app/favicon.ico` exists and is a file (not folder). Hard refresh with `Ctrl+F5`.
</details>

<details>
<summary><b>Admin can't edit products</b></summary>

Check that:
1. User has `is_admin = true` in `profiles` table
2. RLS policies are properly set up
3. `in_stock` is managed by database (not manually updated)
</details>

<details>
<summary><b>Reviews not showing</b></summary>

1. Check RLS policies with `reviews_public_read.sql`
2. Verify realtime is enabled for `reviews` table
3. Check browser console for errors
</details>

<details>
<summary><b>Storage/upload errors</b></summary>

Ensure:
1. `products` bucket exists in Supabase Storage
2. Public read policy is enabled
3. Admin-only write policies are set
</details>

## 🎨 Customization

### Branding
- **Favicon:** Place at `app/favicon.ico`
- **App Icon:** `app/icon.png` (512×512)
- **Apple Touch Icon:** `app/apple-touch-icon.png` (180×180)

### Styling
- Modify `app/globals.css` for global styles
- Update `tailwind.config.ts` for theme customization
- Edit `components.json` for shadcn/ui configuration

## 📝 License

MIT License - feel free to use this project for personal or commercial purposes.

---

<div align="center">

**Built with ❤️ using Next.js, TypeScript, and Supabase**

[Report Bug](https://github.com/faizhuda/agritechjam-mytoko/issues) • [Request Feature](https://github.com/faizhuda/agritechjam-mytoko/issues)

</div>
