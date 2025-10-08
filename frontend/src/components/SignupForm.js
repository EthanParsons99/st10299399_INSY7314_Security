import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SignupForm() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch('https://localhost:3000/user/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      const data = await response.json();

      if (response.status === 201) {
        setMessage('Signup successful! Please log in.');
        setTimeout(() => navigate('/login'), 2000); // Redirect to login after 2 seconds
      } else {
        setMessage(data.Message || 'Signup failed. Please try another username.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setMessage('Network error. Could not connect to the server.');
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Sign Up</button>
      </form>
      {message && <p className={message.includes('successful') ? 'message-success' : 'message-error'}>{message}</p>}
    </div>
  );
}

export default SignupForm;