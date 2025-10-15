import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Muat session awal (AMANKAN error)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setUser(data?.session?.user ?? null);
      } catch (e) {
        console.error("getSession error:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Muat profil (jangan bikin blank; swallow error)
  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) { if (active) setProfile(null); return; }
      try {
        const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
        if (active) setProfile(data ?? null);
      } catch (e) {
        console.warn("load profile:", e.message);
        if (active) setProfile(null);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const actions = useMemo(() => ({
    signUp: async ({ email, password, fullName }) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      const uid = data?.user?.id;
      if (uid) await supabase.from("profiles").upsert({ user_id: uid, full_name: fullName, role: "buyer" });
      return data;
    },
    signIn: async ({ email, password }) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    signOut: async () => { await supabase.auth.signOut(); },
  }), []);

  return (
    <AuthCtx.Provider value={{ user, profile, loading, ...actions }}>
      {/* Jangan kosong saat loading */}
      {loading ? <div className="p-6 text-center text-gray-500">Loading…</div> : children}
    </AuthCtx.Provider>
  );
}
