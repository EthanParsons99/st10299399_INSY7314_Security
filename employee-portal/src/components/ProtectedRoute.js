import React from 'react';
import { Navigate } from 'react-router-dom';

// ProtectedRoute component to guard routes that require authentication
const ProtectedRoute = ({ children }) => {
  const token = sessionStorage.getItem('employeeToken');

  if (!token) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;