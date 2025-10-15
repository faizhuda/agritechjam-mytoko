import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Catalog from "./pages/Catalog";
import Cart from "./pages/Cart";
import Admin from "./pages/Admin";
import ProtectedRoute from "./lib/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "signin", element: <SignIn /> },
      { path: "signup", element: <SignUp /> },
      { path: "catalog", element: <Catalog /> },
      { path: "cart", element: <ProtectedRoute><Cart /></ProtectedRoute> },
      { path: "admin", element: <ProtectedRoute role="admin"><Admin /></ProtectedRoute> },
    ],
  },
]);
