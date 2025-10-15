import { useState } from "react";
import { useAuth } from "../lib/authContext";
import { useNavigate, Link } from "react-router-dom";

export default function SignUp() {
  const { signUp } = useAuth();
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    try { await signUp({ email, password, fullName }); nav("/catalog"); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Daftar</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="border rounded w-full p-2" placeholder="Nama Lengkap" value={fullName} onChange={e=>setFullName(e.target.value)} />
        <input className="border rounded w-full p-2" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="border rounded w-full p-2" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button className="bg-black text-white rounded px-4 py-2 w-full">Buat Akun</button>
      </form>
      <p className="text-sm text-gray-600 mt-3">Sudah punya akun? <Link to="/signin" className="text-blue-600">Masuk</Link></p>
    </div>
  );
}
