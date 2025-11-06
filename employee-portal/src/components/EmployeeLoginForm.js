import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function EmployeeLoginForm() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('https://localhost:3000/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      const data = await response.json();

      if (response.ok && data.role === 'employee') {
        sessionStorage.setItem('employeeToken', data.token);
        sessionStorage.setItem('employeeName', data.name);
        navigate('/dashboard');
      } else {
        setMessage('Access Denied. Invalid credentials or insufficient permissions.');
      }
    } catch (error) {
      console.error('Login Error:', error);
      setMessage('Network error. Could not connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="employeeId">Username</label>
          <input
            id="employeeId" type="text" value={name}
            onChange={(e) => setName(e.target.value)}
            required disabled={isLoading}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            required disabled={isLoading}
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      {message && <p className="message-error">{message}</p>}
    </div>
  );
}

export default EmployeeLoginForm;