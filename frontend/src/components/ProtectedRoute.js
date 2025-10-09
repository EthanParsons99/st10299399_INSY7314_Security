import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('token');
  console.log('ProtectedRoute check - Token exists:', !!token);

  if (!token) {
    console.log('No token found, redirecting to login');
    sessionStorage.clear();
    return <Navigate to="/login" replace />;
  }

  // Checks if token is about to expire
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresIn = (payload.exp * 1000) - Date.now();
    
    if (expiresIn < 0) {
      console.log('Token expired, clearing session');
      sessionStorage.clear();
      return <Navigate to="/login" replace />;
    }
    
    if (expiresIn < 60000) { 
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