import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function middleware(req: NextRequest) {
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

    if (!session) {
      // Redirect to login with original path for post-login return
      const redirect = new URL("/login", req.url)
      redirect.searchParams.set("redirect", redirectTarget)
      return NextResponse.redirect(redirect)
    }

    // User is authenticated
    return res
  } catch (_e) {
    // In case of error, fail closed and redirect to login
    const redirect = new URL("/login", req.url)
    redirect.searchParams.set("redirect", redirectTarget)
    return NextResponse.redirect(redirect)
  }
}

export const config = {
  matcher: [
    "/checkout/:path*",
    "/profile/:path*",
    "/purchase-history/:path*",
    "/wishlist/:path*",
  ],
}
