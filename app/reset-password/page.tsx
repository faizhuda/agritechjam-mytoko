"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"
import Link from "next/link"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const setupSession = async () => {
      console.log("🚀 Starting reset password flow...")
      
      if (!isSupabaseConfigured()) {
        console.error("❌ Supabase not configured")
        setError("Configuration error")
        return
      }

      try {
        // Check for error in URL
        const urlError = searchParams.get("error") || searchParams.get("error_description")
        if (urlError) {
          console.error("❌ URL Error:", urlError)
          setError("This reset link is invalid or has expired. Please request a new one.")
          return
        }

        // Try to get token from query params FIRST
        let accessToken = searchParams.get("access_token")
        let refreshToken = searchParams.get("refresh_token")
        let type = searchParams.get("type")

        console.log("🔍 Query params:", { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken,
          type 
        })

        // If not in query params, check hash
        if (!accessToken && typeof window !== "undefined") {
          const hash = window.location.hash.substring(1)
          const hashParams = new URLSearchParams(hash)
          accessToken = hashParams.get("access_token")
          refreshToken = hashParams.get("refresh_token")
          type = hashParams.get("type")
          
          console.log("🔍 Hash params:", { hasAccessToken: !!accessToken, type })
        }

        if (!accessToken) {
          console.error("❌ No access token found in URL")
          setError("Invalid reset link. Missing access token.")
          return
        }

        if (type !== "recovery") {
          console.error("❌ Wrong token type:", type)
          setError("Invalid reset link type. Expected 'recovery', got: " + type)
          return
        }

        console.log("✓ Found recovery token, verifying...")

        // Use verifyOtp for recovery tokens (doesn't need refresh_token)
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: accessToken,
          type: 'recovery',
        })

        if (verifyError) {
          console.error("❌ verifyOtp error:", verifyError)
          setError("Unable to verify reset link: " + verifyError.message)
          return
        }

        if (!data.session) {
          console.error("❌ No session returned from verifyOtp")
          setError("Unable to establish session. Please try requesting a new reset link.")
          return
        }

        console.log("✅ Session established successfully!", {
          userId: data.session.user.id,
          email: data.session.user.email
        })
        
        setSessionReady(true)
      } catch (e: any) {
        console.error("❌ Unexpected error:", e)
        setError("An error occurred: " + (e.message || "Unknown error"))
      }
    }

    setupSession()
  }, [searchParams])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (password.length < 6) return setError("Password must be at least 6 characters")
    if (password !== confirm) return setError("Passwords do not match")
    setLoading(true)
    try {
      if (!isSupabaseConfigured()) throw new Error("Supabase env not configured")
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setMessage("Password updated. Redirecting to login…")
      setTimeout(() => router.replace("/login"), 800)
    } catch (err: any) {
      setError(err.message ?? "Failed to update password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-center mb-6 text-black">Reset Password</h1>
          
          {!sessionReady && !error ? (
            <div className="space-y-4 py-8 text-center">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <p className="text-black font-bold">Verifying reset link...</p>
            </div>
          ) : error ? (
            <div className="space-y-4 py-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="font-bold text-red-800 mb-2">⚠️ Unable to Reset Password</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <Link 
                href="/forgot-password" 
                className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              >
                Request New Reset Link
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-black mb-2">New Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  minLength={6}
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-bold text-black mb-2">Confirm Password</label>
                <input
                  id="confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold focus:outline-none focus:ring-2 focus:ring-blue-600"
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
              {message && <p className="text-center text-green-600 font-bold">{message}</p>}
              {error && <p className="text-center text-red-600 font-bold">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
