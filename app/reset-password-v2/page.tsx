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
    const checkAndSetupSession = async () => {
      if (!isSupabaseConfigured()) {
        setError("Configuration error")
        return
      }

      try {
        // Check for error in URL first
        const urlError = searchParams.get("error") || searchParams.get("error_description")
        if (urlError) {
          setError("This reset link is invalid or has expired. Please request a new one.")
          return
        }

        // Get access_token from URL (query param)
        const accessToken = searchParams.get("access_token")
        const type = searchParams.get("type")

        if (!accessToken || type !== "recovery") {
          setError("Invalid reset link. Please request a new password reset.")
          return
        }

        console.log("✓ Found recovery token, setting up session...")

        // Set the session using the token
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: searchParams.get("refresh_token") || "",
        })

        if (sessionError || !data.session) {
          console.error("❌ Failed to set session:", sessionError)
          setError("Unable to verify reset link. Please request a new one.")
          return
        }

        console.log("✅ Session ready!")
        setSessionReady(true)
      } catch (e: any) {
        console.error("❌ Error:", e)
        setError("An error occurred. Please try again.")
      }
    }

    checkAndSetupSession()
  }, [searchParams])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Supabase is not configured")
      }

      console.log("🔄 Attempting to update password...")
      const { data, error } = await supabase.auth.updateUser({ password })
      
      if (error) {
        console.error("❌ Update password error:", error)
        throw error
      }

      console.log("✅ Password updated successfully!")
      setMessage("Password updated successfully! Redirecting to login...")
      
      // Sign out to force fresh login with new password
      await supabase.auth.signOut()
      
      setTimeout(() => {
        router.replace("/login")
      }, 1500)
    } catch (err: any) {
      console.error("❌ Error:", err)
      setError(err.message ?? "Failed to update password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-900">Reset Password</h1>
          
          {/* Loading state */}
          {!sessionReady && !error && (
            <div className="space-y-6 py-8 text-center">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-lg mb-2">Verifying reset link...</p>
                <p className="text-gray-500 text-sm">This may take a few moments</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="space-y-6 py-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-900 mb-2">Unable to Reset Password</h3>
                    <p className="text-red-700 text-sm whitespace-pre-line">{error}</p>
                  </div>
                </div>
              </div>
              
              <Link 
                href="/forgot-password" 
                className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Request New Reset Link
              </Link>

              <Link 
                href="/login" 
                className="block text-center text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Back to Login
              </Link>
            </div>
          )}

          {/* Form state */}
          {sessionReady && !error && (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 text-sm font-medium flex items-center gap-2">
                  <span>✓</span>
                  <span>Reset link verified! Enter your new password below.</span>
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  minLength={6}
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  minLength={6}
                  placeholder="Re-enter your new password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating Password..." : "Update Password"}
              </button>

              {message && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-center text-green-700 font-medium">{message}</p>
                </div>
              )}
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-center text-red-700 font-medium">{error}</p>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordV2Page() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
