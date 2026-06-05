"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [passwordStrength, setPasswordStrength] = useState(0)
  const { toast } = useToast()
  const { signUpWithPassword } = useAuth()
  const router = useRouter()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (name === "password") {
      let strength = 0
      if (value.length >= 8) strength++
      if (/[A-Z]/.test(value)) strength++
      if (/[0-9]/.test(value)) strength++
      if (/[^A-Za-z0-9]/.test(value)) strength++
      setPasswordStrength(strength)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Passwords do not match" })
      return
    }
    try {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim()
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined
      const { user, session } = await signUpWithPassword(formData.email, formData.password, { fullName, redirectTo })
      if (!session) {
        // Email confirmation mode
        toast({ title: "Check your email", description: "We sent you a confirmation link." })
      } else {
        toast({ title: "Account created", description: `Welcome ${user?.email}` })
        router.push("/")
      }
    } catch (err: any) {
      toast({ title: "Signup failed", description: err?.message ?? "Unknown error" })
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return "bg-gray-300"
    if (passwordStrength === 1) return "bg-red-500"
    if (passwordStrength === 2) return "bg-yellow-500"
    return "bg-green-600"
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none">
          <h1 className="text-3xl font-black text-center mb-2 text-black uppercase tracking-tight">Create Account</h1>
          <p className="text-center text-black mb-8 font-bold text-sm">Join MyToko and start shopping</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="John"
                  className="w-full px-4 py-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Doe"
                  className="w-full px-4 py-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-black hover:text-blue-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} className="stroke-[2.5]" /> : <Eye size={20} className="stroke-[2.5]" />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 flex-1 border border-black rounded-none ${i < passwordStrength ? getPasswordStrengthColor() : "bg-gray-300"}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-black text-black uppercase">
                    {passwordStrength === 0 && "Very weak"}
                    {passwordStrength === 1 && "Weak"}
                    {passwordStrength === 2 && "Fair"}
                    {passwordStrength === 3 && "Good"}
                    {passwordStrength === 4 && "Strong"}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-black hover:text-blue-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} className="stroke-[2.5]" /> : <Eye size={20} className="stroke-[2.5]" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <div className="flex items-center gap-2 mt-2 text-green-600 text-sm font-black uppercase">
                  <CheckCircle2 size={16} className="stroke-[2.5]" />
                  <span>Passwords match</span>
                </div>
              )}
            </div>

            <label className="flex items-start gap-2 cursor-pointer mt-6 select-none">
              <input
                type="checkbox"
                className="w-4 h-4 border-2 border-black rounded-none accent-black bg-white focus:outline-none mt-1"
                required
              />
              <span className="text-sm font-bold text-black">
                I agree to the{" "}
                <Link href="/terms" className="text-black underline font-black hover:text-blue-600">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-black underline font-black hover:text-blue-600">
                  Privacy Policy
                </Link>
              </span>
            </label>

            <button
              type="submit"
              className="w-full py-3 bg-blue-300 text-black border-2 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all mt-6"
            >
              Create Account
            </button>
          </form>

          <div className="mt-6 pt-6 border-t-2 border-black text-center">
            <p className="text-black font-bold">
              Already have an account?{" "}
              <Link href="/login" className="text-black underline font-black hover:text-blue-600">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
