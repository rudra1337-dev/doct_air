import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute component.
 * Centralizes authentication verification for protected views.
 *
 * @param {Object} props
 * @param {boolean} [props.enforce=false] - When true, redirects unauthenticated users to /sign-in.
 *                                         Defaults to false during initial scaffold so routes can be previewed/tested.
 * @param {React.ReactNode} [props.children] - Child components to render if authorized.
 */
export default function ProtectedRoute({ enforce = false, children }) {
  const { user } = useAuth() || {};
  const location = useLocation();

  if (enforce && !user) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
}
