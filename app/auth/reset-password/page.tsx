"use client"

import { useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"

export default function ResetPasswordPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let retryCount = 0
    const maxRetries = 5

    const ensureSession = async () => {
      try {
        // First, check if there's an error in URL params
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href)
          const urlError = url.searchParams.get("error")
          const errorCode = url.searchParams.get("error_code")
          const errorDescription = url.searchParams.get("error_description")
          
          // Handle error cases
          if (urlError || errorCode) {
            console.error("❌ Reset link error:", { urlError, errorCode, errorDescription })
            
            let friendlyMessage = "Unable to reset password. "
            
            if (errorCode === "otp_expired" || urlError === "access_denied") {
              friendlyMessage += "This reset link has expired or has already been used.\n\n"
            } else if (errorDescription) {
              friendlyMessage += errorDescription + "\n\n"
            } else {
              friendlyMessage += "The link may be invalid, expired, or already used.\n\n"
            }
            
            friendlyMessage += "Please request a new password reset link."
            setError(friendlyMessage)
            setSessionReady(false)
            return
          }

          // Check for hash-based token (legacy flow)
          const hash = window.location.hash
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get("access_token")
          const type = hashParams.get("type")
          
          if (accessToken && type === "recovery") {
            console.log("✓ Found recovery token in hash, waiting for session...")
          }

          // Check for code parameter (PKCE flow)
          const code = url.searchParams.get("code")
          
          if (code) {
            console.log("✓ Found PKCE code, attempting exchange...")
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) {
              console.warn("⚠️ PKCE exchange failed:", error.message)
              // Don't immediately show error, try getting session anyway
            }
          }
        }

        // Check if we have a valid session
        const { data, error: sessionError } = await supabase.auth.getSession()
        
        if (data?.session) {
          console.log("✅ Session ready!")
          setSessionReady(true)
          return
        }

        // Retry if no session yet (Supabase might still be processing)
        retryCount++
        if (retryCount < maxRetries) {
          console.log(`⏳ Waiting for session... (attempt ${retryCount}/${maxRetries})`)
          setTimeout(ensureSession, 500)
        } else {
          // After max retries, show helpful error
          setError(
            "Unable to verify reset link. This could happen if:\n" +
            "• The link was opened in a different browser/device\n" +
            "• The link has expired\n" +
            "• The link has already been used\n\n" +
            "Please request a new password reset link."
          )
          setSessionReady(false)
        }
      } catch (e: any) {
        console.error("❌ Error preparing session:", e)
        setError(e?.message ?? "Failed to prepare reset session")
      }
    }
    
    ensureSession()
  }, [supabase])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (password.length < 6) return setError("Password must be at least 6 characters")
    if (password !== confirm) return setError("Passwords do not match")

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMessage("Password updated. Redirecting to login…")
      setTimeout(() => router.replace("/login"), 800)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-center mb-2 text-black">Reset Password</h1>
          {!sessionReady && !error ? (
            <div className="space-y-4 py-8">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <p className="text-center text-black font-bold">Verifying reset link...</p>
              <p className="text-center text-gray-600 text-sm">Please wait while we prepare your password reset</p>
            </div>
          ) : error ? (
            <div className="space-y-4 py-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <h3 className="font-bold text-red-800 mb-2">⚠️ Unable to Reset Password</h3>
                <p className="text-red-700 text-sm whitespace-pre-line">{error}</p>
              </div>
              <a 
                href="/forgot-password" 
                className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition"
              >
                Request New Reset Link
              </a>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-black mb-2">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-black mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition mt-2"
              >
                {loading ? "Updating…" : "Update Password"}
              </button>
            </form>
          )}
          {message && <p className="mt-4 text-green-600 text-center font-bold">{message}</p>}
          {error && <p className="mt-4 text-red-600 text-center font-bold">{error}</p>}
        </div>
      </div>
    </div>
  )
}
