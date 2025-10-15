import { Navigate } from "react-router-dom";
import { useAuth } from "./authContext";

export default function ProtectedRoute({ children, role }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="p-6 text-center text-gray-500">Checking access…</div>;
  if (!user) return <Navigate to="/signin" replace />;
  if (role && profile?.role !== role) return <Navigate to="/" replace />;
  return children;
}
