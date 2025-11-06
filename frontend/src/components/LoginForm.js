// frontend/src/components/LoginForm.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginForm() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [accountNumber, setAccountNumber] = useState(''); // <-- ADDED
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleNameChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-Z0-9_]*$/.test(value)) {
      setName(value);
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleAccountNumberChange = (e) => { // <-- ADDED
    const value = e.target.value;
    if (/^[0-9]*$/.test(value)) {
      setAccountNumber(value);
    }
  };

  useEffect(() => {
    return () => {
      setPassword('');
      setMessage('');
      setAccountNumber(''); // <-- ADDED
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      const apiUrl = 'https://localhost:3000';
      const response = await fetch(`${apiUrl}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include', 
        body: JSON.stringify({ name, password, accountNumber }), // <-- MODIFIED
      });

      const data = await response.json();

      if (response.ok) {
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('userName', data.name);
        sessionStorage.setItem('accountNumber', data.accountNumber); // <-- ADDED
        
        setPassword('');
        setName('');
        setAccountNumber(''); // <-- ADDED
        
        navigate('/dashboard');
      } else {
        setMessage('Invalid credentials. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            id="username"
            type="text"
            value={name}
            onChange={handleNameChange}
            required
            disabled={isLoading}
            maxLength="20"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            required
            disabled={isLoading}
          />
        </div>
        {/* --- NEW FIELD ADDED HERE --- */}
        <div className="form-group">
          <label htmlFor="accountNumber">Account Number:</label>
          <input
            id="accountNumber"
            type="text"
            value={accountNumber}
            onChange={handleAccountNumberChange}
            required
            disabled={isLoading}
            placeholder="Your 10-digit account number"
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {message && <p className="message-error">{message}</p>}
    </div>
  );
}

export default LoginForm;