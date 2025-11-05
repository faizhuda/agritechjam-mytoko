import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
// @ts-ignore: side-effect CSS import has no type declarations in this project
import "./globals.css"
import Navbar from "@/components/navbar"
import WhatsAppFloat from "@/components/whatsapp-float"
import { CartProvider } from "@/lib/cart-context"
import { WishlistProvider } from "@/lib/wishlist-context"
import { Toaster } from "@/components/ui/toaster"

const geistSans = Geist({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MyToko - E-Commerce Platform",
  description: "A minimalist e-commerce platform for modern shopping",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.className} bg-background text-foreground`}>
        <CartProvider>
          <WishlistProvider>
            <Navbar />
            <main>{children}</main>
            <WhatsAppFloat />
            <Toaster />
          </WishlistProvider>
        </CartProvider>
      </body>
    </html>
  )
}
