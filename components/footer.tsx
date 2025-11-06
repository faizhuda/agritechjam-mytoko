import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* About Section */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-black">MyToko</h3>
            <p className="text-gray-600 text-sm mb-4">
              Your trusted online marketplace for quality products at competitive prices.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-black">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/catalog" className="text-gray-600 hover:text-blue-600 transition text-sm">
                  Catalog
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-600 hover:text-blue-600 transition text-sm">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="text-gray-600 hover:text-blue-600 transition text-sm">
                  Wishlist
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-gray-600 hover:text-blue-600 transition text-sm">
                  Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-black">Legal</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-blue-600 transition text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-blue-600 transition text-sm">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-bold mb-4 text-black">Contact Us</h4>
            <ul className="space-y-2">
              <li className="text-gray-600 text-sm">
                <a href="mailto:faiznaufal2015@gmail.com" className="hover:text-blue-600 transition">
                  faiznaufal2015@gmail.com
                </a>
              </li>
              <li className="text-gray-600 text-sm">
                <a href="tel:+6287787128257" className="hover:text-blue-600 transition">
                  +62 877-8712-8257
                </a>
              </li>
              <li className="text-gray-600 text-sm">
                Dramaga, Indonesia
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-600 text-sm text-center sm:text-left">
              © {new Date().getFullYear()} MyToko. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/terms" className="text-gray-600 hover:text-blue-600 transition text-sm">
                Terms
              </Link>
              <Link href="/privacy" className="text-gray-600 hover:text-blue-600 transition text-sm">
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
