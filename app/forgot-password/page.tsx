"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      })
      
      if (error) {
        toast({ 
          title: "Reset failed", 
          description: error.message,
          variant: "destructive"
        })
      } else {
        toast({ 
          title: "✅ Email sent!", 
          description: "Check your inbox and click the reset link. IMPORTANT: Open the link in THIS browser.",
        })
        // Don't redirect immediately, let user read the message
        setTimeout(() => router.push("/login"), 3000)
      }
    } catch (err: any) {
      toast({ 
        title: "Error", 
        description: err.message || "Failed to send reset email",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-2 border-gray-300 rounded-xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-center mb-2 text-black">Forgot Password</h1>
          <p className="text-center text-black mb-6 font-bold">Enter your email to reset your password</p>

          {/* Important Notice */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 font-semibold">
              <strong>📱 Important:</strong> The reset link must be opened in <strong>this browser</strong>. 
              Don't switch browsers or devices after requesting the reset.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-black mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black font-bold placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-black font-bold">
              Remembered your password? {" "}
              <a href="/login" className="text-blue-600 hover:text-blue-800 font-bold">
                Login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
