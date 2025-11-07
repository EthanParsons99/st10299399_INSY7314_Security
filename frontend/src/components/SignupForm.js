// frontend/src/components/SignupForm.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SignupForm() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false); 
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true); // Start loading

    try {
      const response = await fetch('https://localhost:3000/user/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });
      const data = await response.json();

      if (response.status === 201) {
        // --- DISPLAY THE NEW ACCOUNT NUMBER ---
        setMessage(`Success! Your new account number is: ${data.accountNumber}. Please save this to log in.`);
        // Clear form fields
        setName('');
        setPassword('');
      } else {
        // Use the specific error from the backend if available
        setMessage(data.message || 'Signup failed. Please try another username.');
      }
    } catch (error) {
      console.error('Signup error:', error);
      setMessage('Network error. Could not connect to the server.');
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  // Render the signup form
  return (
    <div className="form-container">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required disabled={isLoading} />
        </div>
        <div className="form-group">
          <label>Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} placeholder="Min 8 chars, uppercase, lowercase, num, symbol"/>
        </div>
        <button type="submit" disabled={isLoading}>{isLoading ? 'Creating Account...' : 'Sign Up'}</button>
      </form>
      {message && <p className={message.includes('Success!') ? 'message-success' : 'message-error'}>{message}</p>}
    </div>
  );
}

export default SignupForm;