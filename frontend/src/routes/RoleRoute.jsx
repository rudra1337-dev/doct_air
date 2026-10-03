import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * RoleRoute component.
 * Centralizes role-based authorization (e.g., PATIENT, PROFESSIONAL, ADMIN).
 *
 * @param {Object} props
 * @param {string[]} [props.allowedRoles=[]] - Array of permitted roles (e.g. ["PATIENT"] or ["PROFESSIONAL", "ADMIN"]).
 * @param {boolean} [props.enforce=false] - When true, redirects unauthorized roles.
 * @param {React.ReactNode} [props.children] - Child components to render if role check passes.
 */
export default function RoleRoute({ allowedRoles = [], enforce = false, children }) {
  const { user } = useAuth() || {};

  if (enforce) {
    if (!user) {
      return <Navigate to="/sign-in" replace />;
    }

    if (allowedRoles.length > 0 && (!user.role || !allowedRoles.includes(user.role))) {
      // Redirect user to their own role's dashboard if mismatched
      const redirectPath =
        user.role === "PATIENT"
          ? "/patient/dashboard"
          : user.role === "PROFESSIONAL"
          ? "/professional/dashboard"
          : "/";

      return <Navigate to={redirectPath} replace />;
    }
  }

  return children ? children : <Outlet />;
}
