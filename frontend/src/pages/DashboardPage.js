import React from 'react';
import { useNavigate } from 'react-router-dom';
import PaymentForm from '../components/PaymentForm';
import TransactionHistory from '../components/TransactionHistory';

function DashboardPage() {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName'); // Assuming you store username on login

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h2>Welcome, {userName || 'Customer'}!</h2>
        <button onClick={handleLogout} className="button-logout">Logout</button>
      </header>
      <div className="dashboard-content">
        <PaymentForm />
        <TransactionHistory />
      </div>
    </div>
  );
}

export default DashboardPage;