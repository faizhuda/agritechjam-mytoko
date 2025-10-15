import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback biar gak crash kalau env belum diisi
if (!url || !anon) {
  console.warn("Supabase ENV belum di-set. UI tetap jalan, API akan gagal.");
}

export const supabase = createClient(url ?? "http://localhost", anon ?? "public-anon-key");
