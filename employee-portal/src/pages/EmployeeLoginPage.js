import React from 'react';
import EmployeeLoginForm from '../components/EmployeeLoginForm';

function EmployeeLoginPage() {
  return (
    <div className="auth-layout">
      <div className="auth-branding">
        <h1>IPS</h1>
        <p>Employee Portal</p>
      </div>
      <div className="auth-form-container">
        <h2>Employee Sign In</h2>
        <EmployeeLoginForm />
      </div>
    </div>
  );
}

export default EmployeeLoginPage;