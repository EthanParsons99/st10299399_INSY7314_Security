import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function EmployeeLoginForm() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const navigate = useNavigate();

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    // Client-side validation
    if (!name || !password) {
      setMessage('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    // Sanitize username (remove extra spaces, prevent script injection)
    const sanitizedName = name.trim().replace(/[<>]/g, '');

    try {
      const response = await fetch('https://localhost:3000/employee/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          name: sanitizedName, 
          password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setAttempts(prev => prev + 1);
        
        // Handle rate limiting / account lockout
        if (response.status === 429) {
          setMessage('Too many login attempts. Please try again in 15 minutes.');
        } else if (attempts >= 4) {
          setMessage('Too many failed attempts. Account temporarily locked.');
        } else {
          setMessage(data.message || 'Invalid credentials.');
        }
        setIsLoading(false);
        return;
      }

      // Verify employee role
      if (data.user && data.user.role === 'employee') {
        // Clear failed attempts on successful login
        setAttempts(0);
        
        // Store token and user info securely
        sessionStorage.setItem('employeeToken', data.token);
        sessionStorage.setItem('employeeName', data.user.name);
        sessionStorage.setItem('employeeRole', data.user.role);
        
        console.log('✓ Employee login successful');
        
        // Redirect to employee dashboard
        navigate('/dashboard');
      } else {
        setMessage('Access Denied. Employee credentials required.');
        sessionStorage.clear();
      }
    } catch (error) {
      console.error('Login Error:', error);
      setMessage('Network error. Could not connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render the login form
  return (
    <div className="form-container">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="employeeId">Username</label>
          <input
            id="employeeId"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
            maxLength={50}
            autoComplete="username"
            placeholder="Enter your username"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            maxLength={100}
            autoComplete="current-password"
            placeholder="Enter your password"
          />
        </div>
        
        <button type="submit" disabled={isLoading || attempts >= 5}>
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      
      {message && <p className="message-error" role="alert">{message}</p>}
      
      {attempts > 0 && attempts < 5 && (
        <p className="warning-message">
          {5 - attempts} attempt{5 - attempts !== 1 ? 's' : ''} remaining
        </p>
      )}
    </div>
  );
}

export default EmployeeLoginForm;