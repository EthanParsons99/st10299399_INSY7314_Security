// frontend/src/pages/DashboardPage.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import PaymentForm from '../components/PaymentForm';
import TransactionHistory from '../components/TransactionHistory';

function DashboardPage() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        {/* --- UPDATED SECTION START --- */}
        <div className="header-branding">
          <h2 className="app-name">IPS</h2>
          <span className="app-subtitle">International Payment System</span>
        </div>
        <div className="header-user-controls">
          <span className="welcome-message">Welcome, {userName || 'Customer'}!</span>
          <button onClick={handleLogout} className="button-logout">Logout</button>
        </div>
        {/* --- UPDATED SECTION END --- */}
      </header>
      <div className="dashboard-content">
        <PaymentForm />
        <TransactionHistory />
      </div>
    </div>
  );
}

export default DashboardPage;