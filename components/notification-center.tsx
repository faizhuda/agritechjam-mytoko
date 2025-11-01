"use client"

import { useState } from "react"
import { Bell, X } from "lucide-react"

interface Notification {
  id: string
  title: string
  message: string
  type: "order" | "delivery" | "promotion" | "alert"
  read: boolean
  timestamp: string
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      title: "Order Placed",
      message: "Your order #ORD-2024-001234 has been placed successfully",
      type: "order",
      read: false,
      timestamp: "2024-01-20 10:30 AM",
    },
    {
      id: "2",
      title: "Out for Delivery",
      message: "Your order is out for delivery and will arrive today",
      type: "delivery",
      read: false,
      timestamp: "2024-01-19 08:15 AM",
    },
    {
      id: "3",
      title: "Special Offer",
      message: "Get 20% off on all electronics this weekend",
      type: "promotion",
      read: true,
      timestamp: "2024-01-18 02:00 PM",
    },
  ])

  const unreadCount = notifications.filter((n) => !n.read).length

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "order":
        return "border-l-4 border-l-blue-600"
      case "delivery":
        return "border-l-4 border-l-green-600"
      case "promotion":
        return "border-l-4 border-l-orange-600"
      case "alert":
        return "border-l-4 border-l-red-600"
      default:
        return "border-l-4 border-l-gray-600"
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)} className="relative p-2 hover:bg-gray-100 rounded-lg transition">
        <Bell size={20} className="text-black" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-50">
          <div className="p-4 border-b-2 border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-black">Notifications</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-600 hover:text-black transition">
              <X size={20} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer ${getNotificationColor(notification.type)} ${
                    !notification.read ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-bold text-black text-sm">{notification.title}</h4>
                      <p className="text-xs text-gray-700 mt-1 font-medium">{notification.message}</p>
                      <span className="text-xs text-gray-600 mt-2 block font-medium">{notification.timestamp}</span>
                    </div>
                    {!notification.read && <div className="w-2 h-2 bg-blue-600 rounded-full ml-2 mt-1 flex-shrink-0" />}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-600 font-medium">No notifications</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t-2 border-gray-200 text-center">
            <button className="text-blue-600 hover:text-blue-800 font-bold text-sm">View All Notifications</button>
          </div>
        </div>
      )}
    </div>
  )
}
