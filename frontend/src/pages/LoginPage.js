import React from 'react';
import LoginForm from '../components/LoginForm';
import { Link } from 'react-router-dom';

function LoginPage() {
  return (
    <div className="page-container">
      <h2>Customer Portal Login</h2>
      <LoginForm />
      <p>
        Don't have an account? <Link to="/signup">Sign Up</Link>
      </p>
    </div>
  );
}

export default LoginPage;