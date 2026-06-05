import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-white border-t-4 border-black mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* About Section */}
          <div className="space-y-4">
            <div>
              <span className="font-black text-xl italic uppercase bg-yellow-300 px-3 py-1.5 border-2 border-black inline-block shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                MyToko
              </span>
            </div>
            <p className="text-black font-bold text-sm">
              Your trusted online marketplace for quality products at competitive prices.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-black mb-4 text-black uppercase tracking-wider border-b-2 border-black pb-1">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/catalog" className="text-black hover:underline transition font-bold text-sm">
                  Catalog
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-black hover:underline transition font-bold text-sm">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="text-black hover:underline transition font-bold text-sm">
                  Wishlist
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-black hover:underline transition font-bold text-sm">
                  Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-black mb-4 text-black uppercase tracking-wider border-b-2 border-black pb-1">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-black hover:underline transition font-bold text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-black hover:underline transition font-bold text-sm">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-black mb-4 text-black uppercase tracking-wider border-b-2 border-black pb-1">Contact Us</h4>
            <ul className="space-y-2 font-bold text-black text-sm">
              <li>
                <a href="mailto:faiznaufal2015@gmail.com" className="hover:underline transition">
                  faiznaufal2015@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:+6287787128257" className="hover:underline transition">
                  +62 877-8712-8257
                </a>
              </li>
              <li className="text-stone-600">
                Dramaga, Indonesia
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t-2 border-black pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-black font-bold text-sm text-center sm:text-left">
              © {new Date().getFullYear()} MyToko. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/terms" className="text-black hover:underline transition font-bold text-sm">
                Terms
              </Link>
              <Link href="/privacy" className="text-black hover:underline transition font-bold text-sm">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
