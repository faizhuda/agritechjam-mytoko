import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Stabilize dev by pinning the workspace root for Turbopack (Next.js 16)
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
