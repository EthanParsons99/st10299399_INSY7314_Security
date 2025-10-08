import React from 'react';
import SignupForm from '../components/SignupForm';
import { Link } from 'react-router-dom';

function SignupPage() {
  return (
    <div className="page-container">
      <h2>Create New Account</h2>
      <SignupForm />
      <p>
        Already have an account? <Link to="/login">Log In</Link>
      </p>
    </div>
  );
}

export default SignupPage;