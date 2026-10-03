import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PageLoader from '../components/common/PageLoader';

/**
 * RoleRoute guard.
 * Enforces role-based authorization for specific application portals.
 * ADMIN accounts are granted umbrella access to PROFESSIONAL-level routes.
 */
export default function RoleRoute({ allowedRoles = [], children }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader message="Verifying permissions..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/sign-in" replace />;
  }

  const userRole = user.role;
  const isAuthorized =
    allowedRoles.length === 0 ||
    allowedRoles.includes(userRole) ||
    (userRole === 'ADMIN' && allowedRoles.includes('PROFESSIONAL'));

  if (!isAuthorized) {
    // Redirect user to their own permitted dashboard rather than leaving them stranded
    const safeFallback =
      userRole === 'PATIENT'
        ? '/patient/dashboard'
        : userRole === 'PROFESSIONAL' || userRole === 'ADMIN'
        ? '/professional/dashboard'
        : '/';

    return <Navigate to={safeFallback} replace />;
  }

  return children ? children : <Outlet />;
}
