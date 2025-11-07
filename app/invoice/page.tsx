import { Suspense } from "react"
import InvoiceClient from "./InvoiceClient"

export const dynamic = "force-dynamic"

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white grid place-items-center">
          <p className="text-black font-bold">Loading invoice...</p>
        </div>
      }
    >
      <InvoiceClient />
    </Suspense>
  )
}
