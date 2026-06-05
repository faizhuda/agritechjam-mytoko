"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [authEmail, setAuthEmail] = useState("")
  const [form, setForm] = useState({ full_name: "", first_name: "", last_name: "", email: "", phone: "", address: "", city: "", zip_code: "" })
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" })
  const [savingPw, setSavingPw] = useState(false)
  const [show, setShow] = useState({ current: false, next: false, confirm: false })
  const [pwStrength, setPwStrength] = useState(0)

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false)
        return
      }
      const { data: auth } = await supabase.auth.getUser()
      const u = auth.user
      if (!u) {
        router.push("/login")
        return
      }
      setAuthEmail(u.email ?? "")
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("full_name, first_name, last_name, phone, address, city, zip_code")
        .eq("id", u.id)
        .maybeSingle()
      if (error) {
        console.error("profile load error", error)
      }
      const p: any = prof || {}
      setForm({
        full_name: p.full_name ?? "",
        first_name: p.first_name ?? "",
        last_name: p.last_name ?? "",
        email: u.email ?? "",
        phone: p.phone ?? "",
        address: p.address ?? "",
        city: p.city ?? "",
        zip_code: p.zip_code ?? "",
      })
      setLoading(false)
    }
    load()
  }, [router])

  const onSave = async () => {
    try {
      if (!isSupabaseConfigured()) return
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user?.id
      if (!uid) return
      // Always update full_name: gabungan first_name + last_name
      const derivedFull = [form.first_name, form.last_name].filter(Boolean).join(" ").trim()
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          full_name: derivedFull,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          address: form.address,
          city: form.city,
          zip_code: form.zip_code,
        })
        .eq("id", uid)
      if (profErr) throw profErr
      if (form.email && form.email !== authEmail) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: form.email })
        if (emailErr) throw emailErr
        toast({ title: "Email update requested", description: "Check your inbox to confirm the new email." })
      }
  toast({ title: "Profile saved", description: "Your changes have been updated." })
  // Force reload to sync global user data (navbar, dashboard, etc)
  setTimeout(() => window.location.reload(), 500)
    } catch (e: any) {
      console.error("profile save error", e)
      const msg = e?.message ?? (e instanceof Error ? e.message : String(e))
      toast({ title: "Could not save profile", description: msg })
    }
  }

  const onChangePassword = async () => {
    try {
      if (!isSupabaseConfigured()) return
      if (!pw.current || !pw.next || !pw.confirm) {
        toast({ title: "Missing fields", description: "Please fill all password fields." })
        return
      }
      if (pw.next.length < 8) {
        toast({ title: "Weak password", description: "New password must be at least 8 characters." })
        return
      }
      if (pw.next !== pw.confirm) {
        toast({ title: "Mismatch", description: "New password and confirmation do not match." })
        return
      }
      setSavingPw(true)
      const { data: auth } = await supabase.auth.getUser()
      const email = auth.user?.email
      if (!email) throw new Error("No authenticated user email found")

      // Verify current password by signing in again
      const { error: verifyErr } = await supabase.auth.signInWithPassword({ email, password: pw.current })
      if (verifyErr) {
        // Common case: wrong current password or account without a password (OAuth-only)
        const hint = verifyErr.message?.toLowerCase().includes("invalid")
          ? "Current password is incorrect."
          : "We couldn't verify your current password."
        toast({
          title: "Unable to verify",
          description: `${hint} If you use Google login, set a password via Forgot Password page.`,
        })
        setSavingPw(false)
        return
      }

      const { error: updErr } = await supabase.auth.updateUser({ password: pw.next })
      if (updErr) throw updErr

      setPw({ current: "", next: "", confirm: "" })
  setPwStrength(0)
      toast({ title: "Password updated", description: "Your password has been changed successfully." })
    } catch (e: any) {
      console.error("password change error", e)
      const msg = e?.message ?? (e instanceof Error ? e.message : String(e))
      toast({ title: "Could not change password", description: msg })
    } finally {
      setSavingPw(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="text-black font-black uppercase text-sm tracking-widest animate-pulse">Loading profile…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-black text-black mb-6 uppercase tracking-tight">Edit Profile</h1>

        <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">First Name</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full p-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-stone-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Last Name</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full p-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-stone-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full p-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-stone-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full p-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-stone-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Street Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full p-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-stone-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full p-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-stone-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">ZIP Code</label>
              <input
                type="text"
                value={form.zip_code}
                onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                className="w-full p-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-stone-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={onSave}
              className="flex-1 py-3 bg-blue-300 text-black border-2 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
            >
              Save Changes
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 py-3 bg-white text-black border-2 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all text-center"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-none space-y-4 mt-8">
          <h2 className="text-xl font-black text-black uppercase tracking-tight border-b-2 border-black pb-2">Change Password</h2>
          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Current Password</label>
            <div className="relative">
              <input
                type={show.current ? "text" : "password"}
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
                placeholder="••••••••"
                className="w-full p-3 pr-10 border-2 border-black rounded-none bg-white text-black font-bold placeholder-stone-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShow({ ...show, current: !show.current })}
                className="absolute right-3 top-3.5 text-black hover:text-blue-600 transition-colors"
                aria-label="Toggle password visibility"
              >
                {show.current ? <EyeOff size={18} className="stroke-[2.5]" /> : <Eye size={18} className="stroke-[2.5]" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">New Password</label>
            <div className="relative">
              <input
                type={show.next ? "text" : "password"}
                value={pw.next}
                onChange={(e) => {
                  const v = e.target.value
                  setPw({ ...pw, next: v })
                  // simple strength: length + classes
                  let s = 0
                  if (v.length >= 8) s++
                  if (/[A-Z]/.test(v)) s++
                  if (/[0-9]/.test(v)) s++
                  if (/[^A-Za-z0-9]/.test(v)) s++
                  setPwStrength(s)
                }}
                placeholder="At least 8 characters"
                className="w-full p-3 pr-10 border-2 border-black rounded-none bg-white text-black font-bold placeholder-stone-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShow({ ...show, next: !show.next })}
                className="absolute right-3 top-3.5 text-black hover:text-blue-600 transition-colors"
                aria-label="Toggle password visibility"
              >
                {show.next ? <EyeOff size={18} className="stroke-[2.5]" /> : <Eye size={18} className="stroke-[2.5]" />}
              </button>
            </div>
            {pw.next && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 border border-black rounded-none ${i < pwStrength ? (pwStrength <= 1 ? "bg-red-500" : pwStrength === 2 ? "bg-yellow-500" : "bg-green-600") : "bg-gray-300"}`}
                    />
                  ))}
                </div>
                <p className="text-xs font-black text-black uppercase">
                  {pwStrength === 0 && "Very weak"}
                  {pwStrength === 1 && "Weak"}
                  {pwStrength === 2 && "Fair"}
                  {pwStrength === 3 && "Good"}
                  {pwStrength === 4 && "Strong"}
                </p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Confirm New Password</label>
            <div className="relative">
              <input
                type={show.confirm ? "text" : "password"}
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                placeholder="Repeat new password"
                className="w-full p-3 pr-10 border-2 border-black rounded-none bg-white text-black font-bold placeholder-stone-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
              />
              <button
                type="button"
                onClick={() => setShow({ ...show, confirm: !show.confirm })}
                className="absolute right-3 top-3.5 text-black hover:text-blue-600 transition-colors"
                aria-label="Toggle password visibility"
              >
                {show.confirm ? <EyeOff size={18} className="stroke-[2.5]" /> : <Eye size={18} className="stroke-[2.5]" />}
              </button>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button
              onClick={onChangePassword}
              disabled={savingPw}
              className="flex-1 py-3 bg-blue-300 text-black border-2 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-60"
            >
              {savingPw ? "Updating…" : "Update Password"}
            </button>
            <Link
              href="/forgot-password"
              className="flex-1 py-3 bg-yellow-200 text-black border-2 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all text-center flex items-center justify-center"
            >
              Forgot Password
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
