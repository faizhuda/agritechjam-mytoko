"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

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
      const { data, error: verifyError } = await supabase.auth.verifyOtp({ type: "recovery", token, email });
      if (verifyError) throw new Error(verifyError.message);
      // Step 2: Update password
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to update password");
      console.error("Update password error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-6 text-center">Reset Password</h1>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full text-center">
            <span className="font-semibold">⚠️ Unable to Reset Password</span>
            <div className="text-sm mt-1">{error}</div>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 w-full text-center">
            <span className="font-semibold">✅ Password Updated!</span>
            <div className="text-sm mt-1">You can now log in with your new password.</div>
          </div>
        )}
        <form className="w-full" onSubmit={handleSubmit}>
          <input
            type="email"
            className="border rounded w-full py-2 px-3 mb-4"
            placeholder="Your Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            className="border rounded w-full py-2 px-3 mb-4"
            placeholder="New Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            disabled={loading}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white font-bold py-2 px-4 rounded w-full hover:bg-blue-700 transition"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
        <button
          className="mt-6 text-blue-600 underline"
          onClick={() => window.location.href = "/forgot-password"}
        >
          Request New Reset Link
        </button>
      </div>
    </div>
  );
}
