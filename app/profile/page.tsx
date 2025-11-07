"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-black font-bold">Loading profile…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-black mb-6">Edit Profile</h1>

        <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-black font-bold mb-2">First Name</label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-black font-bold mb-2">Last Name</label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-black font-bold mb-2">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-black font-bold mb-2">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-black font-bold mb-2">Street Address</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-black font-bold mb-2">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-black font-bold mb-2">ZIP Code</label>
              <input
                type="text"
                value={form.zip_code}
                onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onSave}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
            >
              Save Changes
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 py-2 border-2 border-gray-300 text-black rounded-lg font-bold hover:bg-gray-100 transition"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white border-2 border-gray-300 rounded-xl p-6 shadow-lg space-y-4 mt-6">
          <h2 className="text-xl font-bold text-black">Change Password</h2>
          <div>
            <label className="block text-black font-bold mb-2">Current Password</label>
            <div className="relative">
              <input
                type={show.current ? "text" : "password"}
                value={pw.current}
                onChange={(e) => setPw({ ...pw, current: e.target.value })}
                placeholder="••••••••"
                className="w-full p-3 pr-10 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShow({ ...show, current: !show.current })}
                className="absolute right-3 top-3 text-black hover:text-blue-600"
                aria-label="Toggle password visibility"
              >
                {show.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-black font-bold mb-2">New Password</label>
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
                className="w-full p-3 pr-10 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShow({ ...show, next: !show.next })}
                className="absolute right-3 top-3 text-black hover:text-blue-600"
                aria-label="Toggle password visibility"
              >
                {show.next ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {pw.next && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full ${i < pwStrength ? (pwStrength <= 1 ? "bg-red-500" : pwStrength === 2 ? "bg-yellow-500" : "bg-green-600") : "bg-gray-300"}`}
                    />
                  ))}
                </div>
                <p className="text-xs font-semibold text-black">
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
            <label className="block text-black font-bold mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={show.confirm ? "text" : "password"}
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                placeholder="Repeat new password"
                className="w-full p-3 pr-10 border-2 border-gray-300 rounded-lg text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => setShow({ ...show, confirm: !show.confirm })}
                className="absolute right-3 top-3 text-black hover:text-blue-600"
                aria-label="Toggle password visibility"
              >
                {show.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onChangePassword}
              disabled={savingPw}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-60"
            >
              {savingPw ? "Updating…" : "Update Password"}
            </button>
            <a
              href="/forgot-password"
              className="flex-1 py-2 border-2 border-gray-300 text-black rounded-lg font-bold hover:bg-gray-100 transition text-center"
            >
              Forgot Password
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
