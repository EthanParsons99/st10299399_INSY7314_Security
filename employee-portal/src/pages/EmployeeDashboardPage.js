import React from 'react';
import { useNavigate } from 'react-router-dom';
import PendingPaymentsTable from '../components/PendingPaymentsTable';

function EmployeeDashboardPage() {
  const navigate = useNavigate();
  const employeeName = sessionStorage.getItem('employeeName');

  const handleLogout = () => {
    sessionStorage.removeItem('employeeToken');
    sessionStorage.removeItem('employeeName');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-branding">
          <h2 className="app-name">IPS Employee Portal</h2>
          <span className="app-subtitle">Payment Verification Dashboard</span>
        </div>
        <div className="header-user-controls">
          <span className="welcome-message">Welcome, {employeeName}!</span>
          <button onClick={handleLogout} className="button-logout">Logout</button>
        </div>
      </header>
      <main className="dashboard-content-full">
        <PendingPaymentsTable />
      </main>
    </div>
  );
}

export default EmployeeDashboardPage;