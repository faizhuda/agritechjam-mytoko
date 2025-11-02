// Deprecated middleware - logic moved to proxy.ts (Next.js 16)
export function middleware() {
  return new Response(null, { status: 200 })
}

export const config = {
  matcher: [],
}
