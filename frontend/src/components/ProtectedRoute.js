import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('token');
  console.log('ProtectedRoute check - Token exists:', !!token);

  if (!token) {
    console.log('No token found, redirecting to login');
    // Clear any stale data
    sessionStorage.clear();
    return <Navigate to="/login" replace />;
  }

  // Check if token is about to expire (optional: check jwt exp claim)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresIn = (payload.exp * 1000) - Date.now();
    
    if (expiresIn < 0) {
      console.log('Token expired, clearing session');
      sessionStorage.clear();
      return <Navigate to="/login" replace />;
    }
    
    if (expiresIn < 60000) { // Less than 1 minute
      console.warn('Token expiring soon:', Math.round(expiresIn / 1000), 'seconds');
    }
  } catch (err) {
    console.error('Token validation error:', err);
    sessionStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;