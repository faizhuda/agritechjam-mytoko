export interface Product {
  id: number
  name: string
  price: number
  originalPrice?: number
  category: string
  rating: number
  reviews: number
  image: string
  description: string
  longDescription: string
  features: string[]
  stock: number
  inStock: boolean
}

export interface Order {
  id: string
  date: string
  total: number
  status: "completed" | "pending" | "shipped" | "delivered"
  items: OrderItem[]
  rating?: number
  review?: string
}

export interface OrderItem {
  productId: number
  productName: string
  quantity: number
  price: number
}

export interface Review {
  id: string
  productId: number
  author: string
  rating: number
  title: string
  comment: string
  date: string
  helpful: number
  liked?: boolean
}

export const productDatabase: Product[] = [
  {
    id: 1,
    name: "Premium Headphones",
    price: 1250000,
    originalPrice: 1499000,
    category: "electronics",
    rating: 4.5,
    reviews: 128,
    image: "/premium-headphones.png",
    description: "High-quality wireless headphones with noise cancellation",
    longDescription:
      "Experience superior sound quality with our Premium Headphones featuring active noise cancellation, 30-hour battery life, and premium comfort padding for extended use.",
    features: ["Active Noise Cancellation", "30-hour battery", "Bluetooth 5.0", "Premium comfort padding"],
    stock: 45,
    inStock: true,
  },
  {
    id: 2,
    name: "Wireless Mouse",
    price: 120000,
    category: "electronics",
    rating: 4.2,
    reviews: 89,
    image: "/wireless-mouse.png",
    description: "Ergonomic wireless mouse with precision tracking",
    longDescription:
      "A sleek ergonomic mouse designed for comfort and precision. Features 6 programmable buttons, adjustable DPI settings, and 2-year battery life on a single charge.",
    features: ["Ergonomic design", "6 programmable buttons", "Adjustable DPI", "2-year battery life"],
    stock: 120,
    inStock: true,
  },
  {
    id: 3,
    name: "USB-C Cable",
    price: 25000,
    category: "accessories",
    rating: 4.8,
    reviews: 256,
    image: "/usb-c-cable.jpg",
    description: "Durable USB-C charging and data transfer cable",
    longDescription:
      "Heavy-duty USB-C cable with reinforced connectors. Supports fast charging up to 100W and high-speed data transfer at 480Mbps. Compatible with all USB-C devices.",
    features: ["100W fast charging", "480Mbps data transfer", "Reinforced connectors", "5-year warranty"],
    stock: 200,
    inStock: true,
  },
  {
    id: 4,
    name: "Phone Stand",
    price: 35000,
    category: "accessories",
    rating: 4.3,
    reviews: 145,
    image: "/phone-stand.jpg",
    description: "Adjustable phone stand for all devices",
    longDescription:
      "Universal adjustable phone stand with stable base and flexible arms. Perfect for desks, tables, or anywhere you need hands-free viewing.",
    features: ["Adjustable viewing angles", "Universal compatibility", "Stable base", "Portable design"],
    stock: 87,
    inStock: true,
  },
  {
    id: 5,
    name: "Mechanical Keyboard",
    price: 850000,
    originalPrice: 999000,
    category: "electronics",
    rating: 4.7,
    reviews: 203,
    image: "/mechanical-keyboard.png",
    description: "RGB mechanical keyboard with Cherry MX switches",
    longDescription:
      "Professional-grade mechanical keyboard with customizable RGB lighting, Cherry MX mechanical switches, and programmable macros for gaming and productivity.",
    features: ["Cherry MX switches", "RGB lighting", "Programmable macros", "Aluminum frame"],
    stock: 65,
    inStock: true,
  },
  {
    id: 6,
    name: "Screen Protector",
    price: 20000,
    category: "accessories",
    rating: 4.1,
    reviews: 178,
    image: "/screen-protector.png",
    description: "Tempered glass screen protector for phones",
    longDescription:
      "Premium tempered glass with 9H hardness rating. Easy installation with bubble-free application. Protects against scratches and drops.",
    features: ["9H hardness", "Bubble-free application", "Crystal clear", "Easy removal"],
    stock: 300,
    inStock: true,
  },
  {
    id: 7,
    name: "Laptop Stand",
    price: 150000,
    category: "accessories",
    rating: 4.4,
    reviews: 167,
    image: "/laptop-stand.png",
    description: "Adjustable aluminum laptop stand for ergonomics",
    longDescription:
      "Premium aluminum laptop stand with multiple height adjustments. Improve posture and reduce neck strain while working or studying.",
    features: ["Aluminum construction", "6 height levels", "Supports up to 17-inch laptops", "Portable"],
    stock: 54,
    inStock: true,
  },
  {
    id: 8,
    name: "Portable Charger",
    price: 230000,
    category: "electronics",
    rating: 4.6,
    reviews: 195,
    image: "/portable-charger-lifestyle.png",
    description: "20000mAh portable power bank with fast charging",
    longDescription:
      "High-capacity 20000mAh power bank with dual USB-C ports and fast charging support. Charge multiple devices simultaneously with this portable powerhouse.",
    features: ["20000mAh capacity", "Dual USB-C ports", "Fast charging", "LED display"],
    stock: 78,
    inStock: true,
  },
]

export const sampleOrders: Order[] = [
  {
    id: "ORD-001",
    date: "2024-01-15",
    total: 1375000,
    status: "delivered",
    items: [{ productId: 1, productName: "Premium Headphones", quantity: 1, price: 1250000 }],
    rating: 5,
    review: "Excellent headphones! Great sound quality and very comfortable.",
  },
  {
    id: "ORD-002",
    date: "2024-01-20",
    total: 264000,
    status: "delivered",
    items: [{ productId: 2, productName: "Wireless Mouse", quantity: 2, price: 120000 }],
  },
  {
    id: "ORD-003",
    date: "2024-02-05",
    total: 132000,
    status: "shipped",
    items: [
      { productId: 3, productName: "USB-C Cable", quantity: 2, price: 25000 },
      { productId: 4, productName: "Phone Stand", quantity: 2, price: 35000 },
    ],
  },
]

export const sampleReviews: Review[] = [
  {
    id: "REV-001",
    productId: 1,
    author: "John Doe",
    rating: 5,
    title: "Best headphones I've owned",
    comment: "Sound quality is incredible and they're so comfortable for long listening sessions.",
    date: "2024-01-10",
    helpful: 24,
  },
  {
    id: "REV-002",
    productId: 1,
    author: "Jane Smith",
    rating: 4,
    title: "Great but pricey",
    comment: "Amazing features but wish they were a bit more affordable.",
    date: "2024-01-05",
    helpful: 18,
  },
]
