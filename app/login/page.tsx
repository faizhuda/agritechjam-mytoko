"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [remember, setRemember] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const { signInWithPassword, signInWithGoogle } = useAuth()
  const getRedirect = () => {
    if (typeof window === "undefined") return "/"
    try {
      const url = new URL(window.location.href)
      return url.searchParams.get("redirect") || "/"
    } catch {
      return "/"
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
  const redirectTo = getRedirect()
  await signInWithPassword(formData.email, formData.password)
      // Persist preference for subsequent sessions
      try {
        const maxAge = 60 * 60 * 24 * 365 // 1 year
        document.cookie = `remember_me=${remember ? "1" : "0"}; path=/; SameSite=Lax; ${remember ? `max-age=${maxAge}` : ""}`

        // If user chose not to be remembered, constrain auth to the current tab session
        if (!remember && typeof window !== 'undefined') {
          const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
          let ref = ""
          try { ref = new URL(supaUrl).hostname.split(".")[0] || "" } catch {}
          const key = ref ? `sb-${ref}-auth-token` : ""
          if (key && window.localStorage && window.sessionStorage) {
            const val = window.localStorage.getItem(key)
            if (val) {
              // Move token to sessionStorage so it disappears when the tab closes
              try { window.sessionStorage.setItem(key, val) } catch {}
              try { window.localStorage.removeItem(key) } catch {}
            }
          }
          // Also make sure we clear any persisted session when the tab/window closes
          window.addEventListener('beforeunload', () => {
            try { window.localStorage.removeItem('sb-last-refresh-token') } catch {}
          })
        }
      } catch {}
      toast({ title: "Signed in", description: "Welcome back!" })
  router.push(redirectTo)
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.message ?? "Unknown error" })
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none">
          <h1 className="text-3xl font-black text-center mb-2 text-black uppercase tracking-tight">Welcome Back</h1>
          <p className="text-center text-black mb-8 font-bold text-sm">Sign in to your MyToko account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-black hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} className="stroke-[2.5]" /> : <Eye size={20} className="stroke-[2.5]" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 border-2 border-black rounded-none accent-black bg-white focus:outline-none"
                />
                <span className="font-bold text-black">Remember Me</span>
              </label>
              <Link href="/forgot-password" className="text-black underline font-black hover:text-blue-600">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-300 text-black border-2 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all mt-6"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-black text-center">
            <p className="text-black mb-4 font-bold">
              Don't have an account?{" "}
              <Link href="/signup" className="text-black underline font-black hover:text-blue-600">
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t-2 border-black">
            <p className="text-xs text-black text-center mb-4 font-black uppercase">Or continue with</p>
            <div className="flex">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const origin = typeof window !== "undefined" ? window.location.origin : ""
                    const url = new URL("/auth/callback", origin)
                    const redirectTo = getRedirect()
                    if (redirectTo) url.searchParams.set("redirect", redirectTo)
                    await signInWithGoogle({ redirectTo: url.toString() })
                  } catch (err: any) {
                    toast({ title: "Google sign-in failed", description: err?.message ?? "Check provider config" })
                  }
                }}
                className="w-full py-2 border-2 border-black rounded-none bg-white hover:bg-stone-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-black text-black text-sm flex items-center justify-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path fill="#FFC107" d="M43.6 20.5h-1.9v-.1H24v7.2h11.3C33.9 31.6 29.5 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.1-5.1C33.7 6 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.9z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l5.9 4.3C13.6 16 18.4 12 24 12c3 0 5.7 1.1 7.8 2.9l5.1-5.1C33.7 6 29.1 4 24 4 15.4 4 8 8.9 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.4 0 10.4-2.1 14.1-5.5l-6.5-5.5C29.7 34.8 27 36 24 36c-5.5 0-9.9-3.4-11.6-8.2l-6.6 5.1C8 39 15.4 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5h-1.9v-.1H24v7.2h11.3c-1.3 3.8-4.9 6.3-9.3 6.3-5.5 0-9.9-3.4-11.6-8.2l-6.6 5.1C8 39 15.4 44 24 44c8 0 14.8-5.4 17.1-12.9.8-2.3 1.2-4.7 1.2-7.1 0-1.3-.1-2.7-.4-3.9z"/>
                </svg>
                <span>Google</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-black mt-6 font-bold">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-black underline font-black hover:text-blue-600">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-black underline font-black hover:text-blue-600">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
