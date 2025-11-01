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
                className="w-full py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition font-bold text-black text-sm"
              >
                Continue with Google
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
