import { NavLink } from 'react-router-dom'

const linkBase =
  'px-3 py-2 rounded-md text-sm font-medium transition hover:bg-slate-100'
const linkActive =
  'bg-slate-900 text-white hover:bg-slate-900'

export default function Navbar() {
  const mkClass = ({ isActive }) =>
    `${linkBase} ${isActive ? linkActive : 'text-slate-700'}`

  return (
    <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        {/* MY TOKO */}
        <div className="mr-2 select-none rounded-lg bg-slate-900 px-4 py-3 text-s font-bold tracking-wide text-white">
          My Toko
        </div>

        {/* LINK NAVBAR CUY */}
        <div className="flex flex-wrap items-center gap-3">
          <NavLink to="/" className={mkClass} end>Catalog</NavLink>
          <NavLink to="/cart" className={mkClass}>Cart</NavLink>
          <NavLink to="/checkout" className={mkClass}>Checkout</NavLink>
          <NavLink to="/payment" className={mkClass}>Payment</NavLink>
          <NavLink to="/admin/dashboard" className={mkClass}>Admin</NavLink>
        </div>

        {/* BUKANKAH INI... */}
        <div className="ml-auto text-xs text-slate-400">
          bukankah ini my agritekjem gwehj
        </div>
      </nav>
    </header>
  )
}
