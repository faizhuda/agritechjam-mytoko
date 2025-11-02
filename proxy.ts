import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export default async function proxy(req: NextRequest) {
  const url = new URL(req.url)
  const pathname = url.pathname
  const redirectTarget = `${pathname}${url.search}`

  const res = NextResponse.next()
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return req.cookies.get(name)?.value
          },
          set(name, value, options) {
            res.cookies.set({ name, value, ...options })
          },
          remove(name, options) {
            res.cookies.set({ name, value: "", ...options, maxAge: 0 })
          },
        },
      }
    )
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const protectedPaths = ["/checkout", "/profile", "/purchase-history", "/wishlist"]
    const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))

    if (isProtected && !session) {
      const redirect = new URL("/login", req.url)
      redirect.searchParams.set("redirect", redirectTarget)
      return NextResponse.redirect(redirect)
    }

    return res
  } catch {
    const redirect = new URL("/login", req.url)
    redirect.searchParams.set("redirect", redirectTarget)
    return NextResponse.redirect(redirect)
  }
}

export const config = {
  matcher: ["/checkout/:path*", "/profile/:path*", "/purchase-history/:path*", "/wishlist/:path*"],
}
