import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginForm() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // PROTECTION 1: Validate input on change (prevents XSS)
  const handleNameChange = (e) => {
    const value = e.target.value;
    // Only allow alphanumeric and underscore
    if (/^[a-zA-Z0-9_]*$/.test(value)) {
      setName(value);
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  // PROTECTION 2: Clear sensitive data on component unmount
  useEffect(() => {
    return () => {
      setPassword('');
      setMessage('');
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    try {
      // Uses HTTPS
      const apiUrl = process.env.REACT_APP_API_URL || 'https://localhost:3000';
      const response = await fetch(`${apiUrl}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include', 
        body: JSON.stringify({ name, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // stores token in sessionStorage
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('userName', data.name);
        
        // Clears sensitive data
        setPassword('');
        setName('');
        
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
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {message && <p className="message-error">{message}</p>}
    </div>
  );
}

export default LoginForm;