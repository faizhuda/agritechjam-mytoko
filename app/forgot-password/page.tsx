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
          title: "Email sent!", 
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
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none">
          <h1 className="text-3xl font-black text-center mb-2 text-black uppercase tracking-tight">Forgot Password</h1>
          <p className="text-center text-black mb-6 font-bold text-sm">Enter your email to reset your password</p>

          {/* Important Notice */}
          <div className="bg-yellow-200 border-2 border-black p-4 mb-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-sm text-black font-bold">
              <strong className="uppercase">Important:</strong> The reset link must be opened in <strong className="underline">this browser</strong>. 
              Don't switch browsers or devices after requesting the reset.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-300 text-black border-2 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-black font-bold">
              Remembered your password?{" "}
              <a href="/login" className="text-black underline font-black hover:text-blue-600">
                Login
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
