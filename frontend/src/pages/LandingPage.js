// frontend/src/pages/LandingPage.js

import React from 'react';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <div className="auth-layout">
      <div className="auth-branding">
        <h1>IPS</h1>
        <p>International Payment System</p>
      </div>
      <div className="auth-form-container">
        <h2>Welcome to the Future of Secure Global Payments</h2>
        <p className="landing-intro-text">
          Please log in to manage your account or sign up to create a new one.
        </p>
        <div className="landing-actions-form">
          <Link to="/login" className="btn btn-primary">Log In</Link>
          <Link to="/signup" className="btn btn-secondary">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;