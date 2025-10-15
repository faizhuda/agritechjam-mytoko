import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 text-slate-900">
      {/* Hero Section tanpa gambar */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center md:text-left">
        <div className="md:max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Nikmati Cemilan Lezat dari{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-orange-500">
              Snackku!
            </span>
          </h1>
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            Temukan berbagai pilihan snack lokal dan modern dengan kemasan
            praktis, rasa autentik, dan harga bersahabat. Yuk, manjakan lidahmu
            hari ini!
          </p>

          <div className="flex justify-center md:justify-start gap-4">
            <Link
              to="/catalog"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white font-semibold rounded-lg shadow hover:opacity-70 transition"
            >
              Lihat Katalog
            </Link>
            <Link
              to="/signin"
              className="px-6 py-3 border-2 border-slate-800 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition"
            >
              Masuk
            </Link>
          </div>
        </div>
      </section>

      {/* Highlight Section */}
      <section className="max-w-5xl mx-auto px-6 pb-20 text-center">
        <h2 className="text-2xl font-bold mb-6">Kenapa Pilih Snackku?</h2>
        <div className="grid md:grid-cols-3 gap-8 text-slate-700">
          <div className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-lg font-semibold mb-2">🍪 Varian Lezat</h3>
            <p className="text-sm">
              Dari snack gurih, manis, hingga pedas — kami punya semuanya!
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-lg font-semibold mb-2">📦 Kemasan Praktis</h3>
            <p className="text-sm">
              Mudah dibawa ke mana aja, cocok buat bekal atau hadiah kecil.
            </p>
          </div>

          <div className="p-6 bg-white rounded-xl shadow hover:shadow-lg transition">
            <h3 className="text-lg font-semibold mb-2">💰 Harga Terjangkau</h3>
            <p className="text-sm">
              Nikmati camilan berkualitas tanpa bikin dompet menjerit.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
