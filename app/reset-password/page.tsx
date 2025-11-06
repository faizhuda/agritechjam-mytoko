"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"
import Link from "next/link"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    let attempts = 0
    const maxAttempts = 10

    const checkSession = async () => {
      if (!isSupabaseConfigured()) {
        setSessionReady(true)
        return
      }

      // Check for errors in BOTH URL search params AND hash
      if (typeof window !== "undefined") {
        // Check search params (?error=...)
        const searchParams = new URLSearchParams(window.location.search)
        const searchError = searchParams.get("error") || searchParams.get("error_description")
        
        // Check hash params (#error=...)
        const hash = window.location.hash.substring(1) // Remove #
        const hashParams = new URLSearchParams(hash)
        const hashError = hashParams.get("error") || hashParams.get("error_description")
        const errorCode = hashParams.get("error_code")
        
        if (searchError || hashError || errorCode) {
          console.error("❌ Reset link error:", { searchError, hashError, errorCode })
          setError("This reset link has expired or is invalid. Please request a new one.")
          setSessionReady(false)
          return
        }

        // Check if we have access_token in hash
        const accessToken = hashParams.get("access_token")
        const type = hashParams.get("type")
        
        if (accessToken && type === "recovery") {
          console.log("✓ Found recovery token in hash, verifying...")
          // Give Supabase time to process the hash token
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession()
      
      if (data?.session) {
        console.log("✅ Session established")
        setSessionReady(true)
        return
      }

      attempts++
      if (attempts < maxAttempts) {
        console.log(`⏳ Waiting for session... (${attempts}/${maxAttempts})`)
        setTimeout(checkSession, 500)
      } else {
        console.error("❌ Session not established after max attempts")
        setError("Unable to verify reset link. Please request a new password reset link.")
        setSessionReady(false)
      }
    }

    checkSession()
  }, [])

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
