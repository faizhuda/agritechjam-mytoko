"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabaseBrowser as supabase, isSupabaseConfigured } from "@/lib/supabase/browser"
import Link from "next/link"

export default function ResetPasswordV2Page() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")

  useEffect(() => {
    let attempts = 0
    const maxAttempts = 12

    const checkSession = async () => {
      if (!isSupabaseConfigured()) {
        setError("Supabase is not configured properly")
        return
      }

      try {
        if (typeof window === "undefined") return

        // Parse URL for debugging
        const url = new URL(window.location.href)
        const hash = window.location.hash
        const hashParams = new URLSearchParams(hash.substring(1))
        const searchParams = new URLSearchParams(window.location.search)

        // Debug info
        const debug = {
          hasHash: !!hash,
          hasAccessToken: !!hashParams.get("access_token"),
          hasRefreshToken: !!hashParams.get("refresh_token"),
          type: hashParams.get("type"),
          searchError: searchParams.get("error"),
          hashError: hashParams.get("error"),
          errorCode: hashParams.get("error_code"),
        }
        setDebugInfo(JSON.stringify(debug, null, 2))
        console.log("🔍 Debug info:", debug)

        // Check for errors
        if (debug.searchError || debug.hashError || debug.errorCode) {
          setError("This reset link has expired, is invalid, or has already been used. Please request a new one.")
          setSessionReady(false)
          return
        }

        // If we have access token in hash, process it
        if (debug.hasAccessToken && debug.type === "recovery") {
          console.log("✓ Found recovery token, attempting to establish session...")
          
          // Try to refresh session to make sure Supabase processes the hash
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) {
            console.warn("⚠️ Refresh error:", refreshError.message)
          } else if (refreshData?.session) {
            console.log("✅ Session established via refresh!")
            setSessionReady(true)
            return
          }
        }

        // Check current session
        const { data, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error("❌ Session error:", sessionError)
          attempts++
          if (attempts >= maxAttempts) {
            setError("Unable to verify reset link after multiple attempts. Please request a new password reset link.")
            setSessionReady(false)
            return
          }
          console.log(`⏳ Retrying... (${attempts}/${maxAttempts})`)
          setTimeout(checkSession, 400)
          return
        }

        if (data?.session) {
          console.log("✅ Session ready!", data.session.user.email)
          setSessionReady(true)
          return
        }

        // No session yet, keep trying
        attempts++
        if (attempts < maxAttempts) {
          console.log(`⏳ Waiting for session... (${attempts}/${maxAttempts})`)
          setTimeout(checkSession, 400)
        } else {
          console.error("❌ Max attempts reached, no session found")
          setError("Unable to verify reset link. This could happen if:\n• The link was opened in a different browser\n• The link has expired\n• The link has already been used\n\nPlease request a new password reset link.")
          setSessionReady(false)
        }
      } catch (e: any) {
        console.error("❌ Error in checkSession:", e)
        setError(e.message || "An unexpected error occurred")
        setSessionReady(false)
      }
    }

    // Start checking
    checkSession()
  }, [])

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
              {/* Debug info for development */}
              {process.env.NODE_ENV === 'development' && debugInfo && (
                <details className="text-left text-xs bg-gray-100 p-3 rounded">
                  <summary className="cursor-pointer font-mono">Debug Info</summary>
                  <pre className="mt-2 overflow-auto">{debugInfo}</pre>
                </details>
              )}
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
