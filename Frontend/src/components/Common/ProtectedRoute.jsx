import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../pages/AuthContext';

/**
 * Enhanced ProtectedRoute with role-based access control
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The child components to render if access granted
 * @param {boolean} [props.requireAuth=true] - Whether authentication is required
 * @param {string|string[]} [props.requiredRoles] - Required user roles to access the route
 * @param {string} [props.redirectPath='/login'] - Path to redirect to if access denied
 * @param {string} [props.unauthorizedPath='/unauthorized'] - Path for unauthorized access
 * @param {React.ReactNode} [props.loadingComponent] - Custom loading component
 * @param {React.ReactNode} [props.unauthorizedComponent] - Custom unauthorized component
 * @returns {React.ReactElement} Protected route component
 */
const ProtectedRoute = ({
  children,
  requireAuth = true,
  requiredRoles,
  redirectPath = '/login',
  unauthorizedPath = '/unauthorized',
  loadingComponent,
  unauthorizedComponent
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading state
  if (loading) {
    return loadingComponent || (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Checking authentication...</p>
      </div>
      </div>
    );
  }

  // Check if authentication is required but user is not logged in
  if (requireAuth && !user) {
    return (
      <Navigate
      to={redirectPath}
      state={{
        from: location,
        message: 'Please sign in to access this page'
      }}
      replace
      />
    );
  }

  // Check role-based access control
  if (user && requiredRoles) {
    const userRoles = user.roles || [];
    const requiredRolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    const hasRequiredRole = requiredRolesArray.some(role =>
    userRoles.includes(role)
    );

    if (!hasRequiredRole) {
      return unauthorizedComponent || (
        <Navigate
        to={unauthorizedPath}
        state={{ from: location }}
        replace
        />
      );
    }
  }

  // If authentication is NOT required but user IS logged in, redirect away from auth pages
  if (!requireAuth && user) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  // Render the protected content
  return children;
};

export default ProtectedRoute;
