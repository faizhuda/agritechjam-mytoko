import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../lib/authContext";
import logo from "../assets/SnackkuLogo.png";

const linkBase =
  "text-[15px] font-medium text-slate-700 hover:text-slate-900 transition-colors";

export default function Navbar() {
  const { user, profile, signOut, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur">
      <nav className="mx-auto max-w-6xl px-4">
        {/* height & alignment diset agar logo sejajar teks */}
        <div className="flex h-14 items-center">
          {/* Left: Logo + main links */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center shrink-0">
              <img
                src={logo}
                alt="Snackku"
                className="h-7 w-auto object-contain -translate-y-[1px]"
              />
            </Link>

            <NavLink to="/catalog" className={linkBase}>
              Catalog
            </NavLink>
            <NavLink to="/cart" className={linkBase}>
              Cart
            </NavLink>

            {!loading && profile?.role === "admin" && (
              <NavLink to="/admin" className={linkBase}>
                Admin
              </NavLink>
            )}
          </div>

          {/* Right: auth */}
          <div className="ml-auto">
            {user ? (
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <span className="truncate max-w-[180px]">
                  {profile?.full_name ?? user.email}
                </span>
                <button
                  onClick={signOut}
                  className="underline underline-offset-2 hover:text-slate-900"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                to="/signin"
                className="text-sm text-slate-700 hover:text-slate-900 underline underline-offset-2"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </nav>
      {/* garis tipis bawah */}
      <div className="border-b border-slate-200" />
    </header>
  );
}
