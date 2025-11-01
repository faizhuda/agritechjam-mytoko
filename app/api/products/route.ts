import { NextResponse } from "next/server"
import { fetchProducts } from "@/lib/db/products"

export async function GET() {
  try {
    const products = await fetchProducts()
    return NextResponse.json({ products })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 })
  }
}
