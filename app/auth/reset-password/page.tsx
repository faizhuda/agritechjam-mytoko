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
    const ensureSession = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setTimeout(ensureSession, 400)
      } else {
        setSessionReady(true)
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
          {!sessionReady ? (
            <p className="text-center text-black font-bold">Preparing…</p>
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
