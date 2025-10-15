import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-20">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left section */}
        <div className="text-center md:text-left">
          <h3 className="text-xl font-semibold text-slate-800">Snackku!</h3>
          <p className="text-sm text-slate-500 mt-1">
            Cemilan lokal, rasa internasional 🍪
          </p>
        </div>

        {/* Middle nav links */}
        <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-600">
          <Link to="/" className="hover:text-slate-900 transition">Home</Link>
          <Link to="/catalog" className="hover:text-slate-900 transition">Catalog</Link>
          <Link to="/cart" className="hover:text-slate-900 transition">Cart</Link>
        </div>

        {/* Right social / copyright */}
        <div className="text-center md:text-right text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Snackku. All rights reserved.</p>
          <p className="mt-1">
            Made by <span className="font-medium text-slate-700">MyToko</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
