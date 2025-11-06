import React from 'react';
import { useNavigate } from 'react-router-dom';
import PaymentForm from '../components/PaymentForm';
import TransactionHistory from '../components/TransactionHistory';

function DashboardPage() {
  const navigate = useNavigate();
  // Retrieve both userName and accountNumber from sessionStorage
  const userName = sessionStorage.getItem('userName');
  const accountNumber = sessionStorage.getItem('accountNumber');

  const handleLogout = () => {
    // Clear all session items on logout
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('accountNumber');
    navigate('/'); // Navigate to the landing page
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-branding">
          <h2 className="app-name">IPS</h2>
          <span className="app-subtitle">International Payment System</span>
        </div>
        <div className="header-user-controls">
          {}
          <div className="user-details">
            <span className="welcome-message">Welcome, {userName || 'Customer'}!</span>
            {accountNumber && (
              <span className="account-number-display">
                Account: {accountNumber}
              </span>
            )}
          </div>
          {}
          <button onClick={handleLogout} className="button-logout">Logout</button>
        </div>
      </header>
      <div className="dashboard-content">
        <PaymentForm />
        <TransactionHistory />
      </div>
    </div>
  );
}

export default DashboardPage;