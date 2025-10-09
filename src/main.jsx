import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App'
import Catalog from './pages/Catalog'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Payment from './pages/Payment'
import AdminDashboard from './pages/AdminDashboard'

const router = createBrowserRouter([
  { path: '/', element: <App />, children: [
    { index: true, element: <Catalog/> },
    { path: 'cart', element: <Cart/> },
    { path: 'checkout', element: <Checkout/> },
    { path: 'payment', element: <Payment/> },
    { path: 'admin/dashboard', element: <AdminDashboard/> },
  ]},
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><RouterProvider router={router} /></React.StrictMode>
)
