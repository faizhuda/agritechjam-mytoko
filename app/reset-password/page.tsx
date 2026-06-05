"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../lib/supabase/browser";

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const params = new URLSearchParams(hash.substring(1));
    const t = params.get("access_token");
    const type = params.get("type");
    if (t && type === "recovery") {
      setToken(t);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      if (!token) throw new Error("Invalid recovery token");
      if (!email) throw new Error("Email is required");
      // Step 1: Exchange recovery token for session
  if (!supabaseBrowser) throw new Error("Supabase client not configured");
  const { data, error: verifyError } = await supabaseBrowser.auth.verifyOtp({ type: "recovery", token, email });
  if (verifyError) throw new Error(verifyError.message);
  // Step 2: Update password
  const { error: updateError } = await supabaseBrowser.auth.updateUser({ password });
  if (updateError) throw new Error(updateError.message);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 py-12 px-4">
      <div className="bg-white border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none w-full max-w-md flex flex-col items-center">
        <h1 className="text-3xl font-black mb-6 text-center text-black uppercase tracking-tight">Reset Password</h1>
        {error && (
          <div className="bg-red-200 border-2 border-black text-black px-4 py-3 rounded-none mb-4 w-full text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-bold">
            <span className="uppercase">⚠️ Unable to Reset Password</span>
            <div className="text-sm mt-1">{error}</div>
          </div>
        )}
        {success && (
          <div className="bg-green-200 border-2 border-black text-black px-4 py-3 rounded-none mb-4 w-full text-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] font-bold">
            <span className="uppercase">✅ Password Updated!</span>
            <div className="text-sm mt-1">You can now log in with your new password.</div>
          </div>
        )}
        <form className="w-full space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">Your Email</label>
            <input
              type="email"
              className="w-full px-4 py-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-wide">New Password</label>
            <input
              type="password"
              className="w-full px-4 py-3 border-2 border-black rounded-none bg-white text-black font-bold placeholder-gray-500 focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
              placeholder="New Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-blue-300 text-black border-2 border-black font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
        <button
          className="mt-6 text-black underline font-black hover:text-blue-600 cursor-pointer"
          onClick={() => window.location.href = "/forgot-password"}
        >
          Request New Reset Link
        </button>
      </div>
    </div>
  )
}
