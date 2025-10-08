import React from 'react';
import SignupForm from '../components/SignupForm';
import { Link } from 'react-router-dom';

function SignupPage() {
  return (
    <div className="auth-layout">
      <div className="auth-branding">
        <h1>IPS</h1>
        <p>International Payment System</p>
      </div>
      <div className="auth-form-container">
        <h2>Create New Account</h2>
        <SignupForm />
        <p className="account-link">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;