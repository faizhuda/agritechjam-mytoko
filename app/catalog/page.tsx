import { fetchProducts } from "@/lib/db/products"
import CatalogClient from "@/components/catalog/catalog-client"
import Link from "next/link"

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const products = await fetchProducts()
  const initialSearch = typeof searchParams?.search === "string" ? searchParams!.search : ""
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold mb-8 text-black">Product Catalog</h1>
        <CatalogClient initialProducts={products} initialSearch={initialSearch} />
      </div>
    </div>
  )
}
