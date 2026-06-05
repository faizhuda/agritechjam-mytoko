<div align="center">

# 🛒 MyToko

### Modern E-Commerce Reference App Built with Neo-Brutalist Aesthetics

*Enterprise-grade shopping experience powered by Next.js 16, TypeScript, Supabase, and a bold Playful Neo-Brutalist Design System*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/) 
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/) 
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) 
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3fcf8e?logo=supabase&logoColor=white)](https://supabase.com/) 
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](#-license)

[Features](#-features) • [Design System](#-design-system) • [Quick Start](#-quick-start) • [Database Setup](#-database-setup) • [Troubleshooting](#-troubleshooting)

---

</div>

## ✨ Features

### 🛍️ Customer Experience
- **Smart Product Catalog** — Real-time filtering by category, stock status, price range, and instant URL state sync.
- **Shopping Cart & Checkout** — Quantities validation, 10% tax + Rp 10,000 flat shipping rate, with a mobile-sticky order summary.
- **Order Management & Invoices** — Complete purchase history logs, realtime status tracking, and printable PDF invoices.
- **Reviews & Ratings** — Write reviews, rate products (amber stars), and mark reviews as helpful.
- **Wishlist System** — Save products with instant feedback (rose heart icons).

### 👨‍💼 Admin Dashboard
- **Advanced Analytics** — Revenue tracking, order metrics, customer counts, and growth calculations.
- **Visual Reports** — Sales overview and revenue trend charts using Recharts with customized Neo-Brutalist tooltips.
- **Order Control** — Set order status (Pending, Paid, Shipped, Delivered) with secure RLS and API verification.
- **Product Management** — Add, edit, and archive products including image upload to Supabase Storage.
- **Atomic Cancellation** — Order cancellation restores product stock atomically via database RPC.

---

## 🎨 Design System: Neo-Brutalism / Playful Indie

MyToko utilizes a custom **Neo-Brutalist** theme (inspired by Gumroad and Figma) to provide a premium, hand-crafted, high-contrast user interface.

### Visual Tokens
* **Borders**: Thick solid outlines (`border-4 border-black` or `border-[3px] border-black` / `border-2 border-black`).
* **Shadows**: Flat, sharp, non-blurry offset shadows (`shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` or `shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`).
* **Corners**: Strictly square corners (`rounded-none` or `rounded-0`) across inputs, buttons, tables, cards, and modals.
* **Animations**: Clicking/hovering buttons translates the element down-right and reduces the shadow for tactile feedback:
  ```css
  .neo-btn:hover {
    transform: translate(1px, 1px);
    box-shadow: 3px 3px 0px 0px rgba(0,0,0,1);
  }
  .neo-btn:active {
    transform: translate(4px, 4px);
    box-shadow: none;
  }
  ```

### Color Palette & Guidelines
* **Background**: Warm/organic stone color `#fafaf9` (`bg-stone-50`).
* **Retro Accent Fills**: Highly saturated flat blocks:
  - Yellow: `#fef08a` (`bg-yellow-200`) — used for logo, ratings highlights, and total amount.
  - Cyan: `#c7d2fe` / `#a5f3fc` (`bg-cyan-200`) — used for invoice actions and highlights.
  - Blue: `#3b82f6` (`bg-blue-300`) — used for main primary action CTAs.
  - Pink/Rose: `#fbcfe8` / `#f43f5e` (`bg-rose-500` / `bg-pink-300`) — used for wishlist hearts, alerts, and QRIS ticket headers.
  - Green: `#4ade80` (`bg-green-300`) — used for WhatsApp chat badge, delivery status, and success screens.

### Consistency Guidelines
* **Rating Stars**: In catalog, wishlist, and reviews, rating stars must consistently use:
  - Active: `className="fill-amber-400 text-amber-400 stroke-black stroke-[1.5]"`
  - Half-Active: `className="fill-amber-300 text-amber-300 stroke-black stroke-[1.5]"`
  - Inactive: `className="fill-transparent text-stone-300 stroke-stone-400 stroke-[1.5]"`
* **Wishlist Status**: Hearts indicating wishlisted state must consistently use `className="fill-rose-500 text-rose-500 stroke-[2.5]"` to avoid green/red discrepancies.

---

## 🚀 Quick Start (Dev)

### Prerequisites
- Node.js 18+ (LTS)
- npm (or yarn / pnpm)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/faizhuda/agritechjam-mytoko.git
   cd agritechjam-mytoko
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment variables template:
   ```bash
   cp env.example .env.local
   ```
4. Fill in your Supabase variables in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key # Server-only
   ```
5. Run the local dev server:
   ```bash
   npm run dev
   ```

---

## 🗄️ Database & Supabase Configuration

SQL migrations and remote procedure calls are placed inside the `supabase/` directory.

### Atomic Order Cancellation RPC
Instead of client-side loops updating products one-by-one (which is vulnerable to race conditions and network drops), order cancellation restores product stock atomically at the database transaction layer using a PostgreSQL function:
```sql
select cancel_order_and_restore_stock(p_order_id => 'order-uuid');
```
This checks that the order is in a `pending` or `paid` state, changes the order status to `cancelled`, and loops through the items to restore product stocks safely inside a single database transaction.

### Applied Schema Scripts
- `products_public_read.sql` — RLS policies for products catalog
- `products_storage.sql` — storage bucket policies for product images
- `orders_create_rpc.sql` — transactional order creation and stock reservation
- `orders_set_status_rpc.sql` — secure state updates
- `product_reviews_public_read.sql` & `reviews_helpful_rpc.sql` — feedback tracking

---

## 📊 Charts notes (Recharts)

- Charts in the Admin Panel (`app/admin/page.tsx`) use Recharts `ResponsiveContainer`.
- **Responsive Y-Axis Width**: The dashboard calculates a responsive `yAxisWidth` dynamic state combining the viewport percentage and length of IDR-formatted values to prevent text truncation on mobile while aligning both charts.
- **Custom Tooltips**: Tooltips are customized to match the Neo-Brutalist look:
  `contentStyle={{ backgroundColor: "#ffffff", border: "3px solid #000000", borderRadius: "0px", fontFamily: "monospace", fontWeight: "bold" }}`

---

## 🧪 Testing, Linting & Production Build

- **Lint Check**: Run ESLint to verify codebase format:
  ```bash
  npm run lint
  ```
- **Type Check**: Run TypeScript compiler checks:
  ```bash
  npx tsc --noEmit
  ```
- **Production Build**: Verify static pages generation:
  ```bash
  npm run build
  ```

---

## 🐛 Troubleshooting

- **CSS Parse Error (`Unexpected token Number` / `.gap-2.5`)**: Tailwind utility classes with dots (e.g. `.gap-2.5`) may cause parsing errors under certain CSS bundlers. Always target them in `globals.css` using attribute matching selectors:
  ```css
  [class*="gap-2.5"] { ... }
  ```
- **Admin Actions Failing**: Ensure the user has the `is_admin` column set to `true` in the `profiles` table in Supabase.
- **Stock Pre-check Dialog**: The checkout client performs pre-flight stock validation against Supabase before submitting requests. Ensure `products.stock` values are integers.

---

## 📝 Project Architecture Overview

- [app/layout.tsx](file:///c:/Users/faizn/projects/agritechjam-mytoko/app/layout.tsx) — Main shell containing the body background and compact mode context
- [app/globals.css](file:///c:/Users/faizn/projects/agritechjam-mytoko/app/globals.css) — Custom Neo-Brutalist utility classes and styling overrides
- [components/navbar.tsx](file:///c:/Users/faizn/projects/agritechjam-mytoko/components/navbar.tsx) — Sticky Neo-Brutalist navigation header
- [components/compact-toggle.tsx](file:///c:/Users/faizn/projects/agritechjam-mytoko/components/compact-toggle.tsx) — Density toggle button
- [lib/cart-context.tsx](file:///c:/Users/faizn/projects/agritechjam-mytoko/lib/cart-context.tsx) — Client-side state manager for checkout item queues

---

## License

MIT — see the LICENSE file in this repository.
