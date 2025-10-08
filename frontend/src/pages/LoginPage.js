import React from 'react';
import LoginForm from '../components/LoginForm';
import { Link } from 'react-router-dom';

function LoginPage() {
  return (
    <div className="auth-layout">
      <div className="auth-branding">
        <h1>IPS</h1>
        <p>International Payment System</p>
      </div>
      <div className="auth-form-container">
        <h2>Customer Portal Login</h2>
        <LoginForm />
        <p className="account-link">
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;