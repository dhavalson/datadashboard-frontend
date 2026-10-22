import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();

  const { user, token } = useSelector((state) => state.auth);

  // 1. Get user from Redux store or sessionStorage fallback
  // const reduxUser = useSelector((state) => state.auth?.user);
  // const storedUser = JSON.parse(sessionStorage.getItem('user') || 'null');
  // const user = reduxUser; //|| storedUser;

  // const authState = useSelector((state) => state.auth || {});
  // const authToken = authState.token || sessionStorage.getItem('token') || localStorage.getItem('token');

  // 2. If no user object exists, redirect to login
  if (!user && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Check role-based permissions if allowedRoles array is provided
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role?.toLowerCase();
    const hasPermission = allowedRoles.some(
      (role) => role.toLowerCase() === userRole
    );

    if (!hasPermission) {
      return <Navigate to="/login" replace />;
    }
  }

  // 4. Render children (if wrapped as component) or Outlet (if wrapped as route layout)
  return children ? children : <Outlet />;
};

export default ProtectedRoute;