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
        return "border-l-8 border-l-cyan-300"
      case "delivery":
        return "border-l-8 border-l-green-400"
      case "promotion":
        return "border-l-8 border-l-yellow-300"
      case "alert":
        return "border-l-8 border-l-red-400"
      default:
        return "border-l-8 border-l-black"
    }
  }

  const markAsRead = (id: string) => {
    setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="relative p-2 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all rounded-none"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-black stroke-[2.5]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-400 text-black border-2 border-black text-[10px] font-black rounded-none w-5 h-5 flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-96 bg-white border-4 border-black rounded-none shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-50">
          <div className="p-4 border-b-4 border-black flex justify-between items-center bg-yellow-200">
            <h3 className="text-lg font-black text-black uppercase tracking-tight">Notifications</h3>
            <button 
              onClick={() => setIsOpen(false)} 
              className="text-black border-2 border-black p-1 bg-white hover:bg-stone-50 transition shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[0.5px] hover:translate-y-[0.5px] hover:shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-none"
              aria-label="Close notifications"
            >
              <X size={16} className="stroke-[3]" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 border-b-2 border-black last:border-b-0 hover:bg-stone-50 transition cursor-pointer ${getNotificationColor(notification.type)} ${
                    !notification.read ? "bg-stone-50 font-black" : "font-bold"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-black text-black text-sm uppercase tracking-tight">{notification.title}</h4>
                      <p className="text-xs text-black mt-1 font-bold">{notification.message}</p>
                      <span className="text-[10px] text-stone-600 mt-2 block font-black uppercase">{notification.timestamp}</span>
                    </div>
                    {!notification.read && (
                      <div className="w-3 h-3 bg-red-400 border-2 border-black rounded-none ml-2 mt-1 shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-stone-50">
                <p className="text-black font-black uppercase text-sm">No notifications</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t-4 border-black text-center bg-stone-100">
            <button className="text-black hover:underline font-black uppercase text-xs tracking-wider">
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
