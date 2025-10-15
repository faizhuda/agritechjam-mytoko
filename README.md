# 🛍️ AgritechJam MyToko

Halo Gais!
Aplikasi toko online sederhana berbasis **React + Vite + TailwindCSS + Supabase**  
Dibuat untuk kompetisi **AgriTechJam 2025**.

---

## 🚀 Quick Start

### 1️⃣ Clone Repository

```bash
git clone https://github.com/faizhuda/agritechjam-mytoko.git
cd agritechjam-mytoko
git checkout dev
npm install
```

### 2️⃣ Setup Environment

Buat file `.env` di root project (bukan di `src`):

```
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

> Lihat contoh di `.env.example` jika tersedia.  
> Nilai diambil dari Supabase → **Project Settings → API**.

### 3️⃣ Jalankan Project

```bash
npm run dev
```

Buka di browser [http://localhost:5173](http://localhost:5173)

---

## 🧩 Struktur Folder

```
src/
├─ components/         # Komponen global (Navbar, dll.)
│   └─ Navbar.jsx
├─ lib/                # Utility seperti koneksi Supabase
│   └─ supabaseClient.js
├─ pages/              # Halaman utama aplikasi
│   ├─ Catalog.jsx
│   ├─ Cart.jsx
│   ├─ Checkout.jsx
│   ├─ PaymentSim.jsx
│   └─ AdminDashboard.jsx
├─ App.jsx             # Layout utama (memuat Navbar + Outlet)
├─ main.jsx            # Entry point React + Router setup
└─ index.css           # Tailwind directives
```

---

## 🛠️ Tech Stack

- **React + Vite** → Frontend framework & bundler
- **TailwindCSS v3** → Styling cepat & konsisten
- **React Router DOM** → Routing antar halaman
- **Supabase** → Backend as a Service (Auth, Database, Storage)

---

## 🌿 Branch Workflow

| Branch      | Fungsi                              |
| ----------- | ----------------------------------- |
| `main`      | Kode stabil / siap deploy           |
| `dev`       | Integrasi harian                    |
| `feature/*` | Pengembangan fitur baru per anggota |

> ✨ Semua fitur dikembangkan di `feature/<nama-fitur>` lalu di-_merge_ ke `dev` via Pull Request.  
> Setelah `dev` stabil, baru di-_merge_ ke `main`.

---

## 👥 Cara Kolaborasi

1. Pull branch terbaru:
   ```bash
   git pull origin dev
   ```
2. Buat branch fitur baru:
   ```bash
   git checkout -b feature/<nama-fitur>
   ```
3. Setelah selesai:
   ```bash
   git add .
   git commit -m "feat: deskripsi singkat fitur"
   git push origin feature/<nama-fitur>
   ```
4. Buka **Pull Request** ke `dev` di GitHub.
5. Tunggu review & approval sebelum merge.

---

## 👥 Tim Pengembang

| Nama                         | Peran                  | Kontak |
| ---------------------------- | ---------------------- | ------ |
| **Faiz Naufal Huda**         | Project Lead / Backend | —      |
| **Hilfani Rayyanne Subagio** | Frontend Dev           | —      |
| **Daffa Naufal Mumtaz**      | Fullstack / Deployment | —      |

---

## 📜 Lisensi

Proyek ini dikembangkan untuk **Kompetisi AgriTechJam 2025**  
© 2025 MyToko Team. All rights reserved.
