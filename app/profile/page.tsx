"use client"

import type React from "react"
import { useState } from "react"
import { User, Mail, Phone, MapPin, Lock, Edit2, Save, X } from "lucide-react"

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+1 (555) 123-4567",
    address: "123 Main Street",
    city: "New York",
    zipCode: "10001",
  })

  const [editData, setEditData] = useState(formData)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    setFormData(editData)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditData(formData)
    setIsEditing(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold mb-8 text-black">My Profile</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 text-center shadow-lg">
              <div className="w-24 h-24 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center">
                <User size={48} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-black mb-1">
                {formData.firstName} {formData.lastName}
              </h2>
              <p className="text-black text-sm mb-6 font-medium">{formData.email}</p>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <Edit2 size={18} />
                {isEditing ? "Cancel" : "Edit Profile"}
              </button>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
              {isEditing ? (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-black mb-6">Edit Profile</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={editData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={editData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={editData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black mb-2">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={editData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-black mb-2">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={editData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">City</label>
                      <input
                        type="text"
                        name="city"
                        value={editData.city}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">ZIP Code</label>
                      <input
                        type="text"
                        name="zipCode"
                        value={editData.zipCode}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={handleSave}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                      <Save size={18} />
                      Save Changes
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex-1 py-3 border-2 border-gray-300 text-black rounded-lg font-bold hover:bg-gray-50 transition flex items-center justify-center gap-2"
                    >
                      <X size={18} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-black">Personal Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <User size={20} className="text-blue-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-700 font-semibold">Full Name</p>
                        <p className="font-bold text-black">
                          {formData.firstName} {formData.lastName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <Mail size={20} className="text-blue-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-700 font-semibold">Email Address</p>
                        <p className="font-bold text-black">{formData.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <Phone size={20} className="text-blue-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-700 font-semibold">Phone Number</p>
                        <p className="font-bold text-black">{formData.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <MapPin size={20} className="text-blue-600 mt-1" />
                      <div>
                        <p className="text-sm text-gray-700 font-semibold">Address</p>
                        <p className="font-bold text-black">
                          {formData.address}, {formData.city} {formData.zipCode}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Change Password */}
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mt-6 shadow-lg">
              <h3 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
                <Lock size={20} className="text-blue-600" />
                Change Password
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-2">New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-black mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <button className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition">
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
