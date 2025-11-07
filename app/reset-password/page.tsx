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
    console.log("🚀 Starting reset password flow...")
    
    if (!isSupabaseConfigured()) {
      console.error("❌ Supabase not configured")
      setError("Configuration error")
      return
    }

    // Listen for auth state changes (Supabase processes hash automatically)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      console.log("🔔 Auth state change:", event, session?.user?.email)
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log("✅ Password recovery session detected!")
        setSessionReady(true)
      } else if (event === 'SIGNED_IN' && session) {
        console.log("✅ User signed in!")
        setSessionReady(true)
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log("✅ Token refreshed!")
        setSessionReady(true)
      }
    })

    // Also check if session already exists
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log("✅ Existing session found!")
        setSessionReady(true)
      } else {
        console.log("⏳ No existing session, waiting for auth state change...")
      }
    }

    checkExistingSession()

    // Set timeout to show error if nothing happens
    const timeout = setTimeout(() => {
      if (!sessionReady) {
        console.error("❌ Timeout: No session established")
        setError("Unable to verify reset link. The link may have expired or is invalid. Please request a new one.")
      }
    }, 8000) // 8 seconds timeout

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [sessionReady])

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
