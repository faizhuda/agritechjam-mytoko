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
      toast({ title: "Signed in", description: "Welcome back!" })
  router.push(redirectTo)
    } catch (err: any) {
      toast({ title: "Login failed", description: err?.message ?? "Unknown error" })
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-center mb-2 text-black">Welcome Back</h1>
          <p className="text-center text-black mb-8 font-bold">Sign in to your MyToko account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-black mb-2">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-black mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-black hover:text-blue-600 transition"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-2 border-gray-300 bg-white" />
                <span className="font-bold text-black">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-blue-600 hover:text-blue-800 font-bold">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition mt-6"
            >
              Sign In
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-gray-300 text-center">
            <p className="text-black mb-4 font-bold">
              Don't have an account?{" "}
              <Link href="/signup" className="text-blue-600 font-bold hover:text-blue-800">
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t-2 border-gray-300">
            <p className="text-xs text-black text-center mb-4 font-bold">Or continue with</p>
            <div className="flex">
              <button
                type="button"
                onClick={async () => {
                  try {
                    // Preserve redirect target by passing it to /auth/callback
                    const origin = typeof window !== "undefined" ? window.location.origin : ""
                    const url = new URL("/auth/callback", origin)
                    const redirectTo = getRedirect()
                    if (redirectTo) url.searchParams.set("redirect", redirectTo)
                    await signInWithGoogle({ redirectTo: url.toString() })
                  } catch (err: any) {
                    toast({ title: "Google sign-in failed", description: err?.message ?? "Check provider config" })
                  }
                }}
                className="w-full py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition font-bold text-black text-sm flex items-center justify-center gap-2"
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
          <Link href="/terms" className="text-blue-600 hover:text-blue-800 font-bold">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-blue-600 hover:text-blue-800 font-bold">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
