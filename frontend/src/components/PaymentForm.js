import React, { useState } from 'react';

function PaymentForm() {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ZAR');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // PROTECTION 1: Input validation on change (prevents XSS)
  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  const handleAccountChange = (e) => {
    const value = e.target.value;
    if (/^[0-9]*$/.test(value) && value.length <= 17) {
      setRecipientAccount(value);
    }
  };

  const handleSwiftChange = (e) => {
    const value = e.target.value.toUpperCase();
    if (/^[A-Z0-9]*$/.test(value) && value.length <= 11) {
      setSwiftCode(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    const token = sessionStorage.getItem('token');
    if (!token) {
      setMessage('Session expired. Please log in again.');
      setIsLoading(false);
      return;
    }

    // PROTECTION 2: Validate all fields before sending
    if (!amount || !recipientAccount || !swiftCode) {
      setMessage('All fields are required.');
      setIsLoading(false);
      return;
    }

    const paymentData = {
      amount: parseFloat(amount),
      currency,
      recipientAccount,
      swiftCode,
    };

    try {
      const response = await fetch('https://localhost:3000/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Requested-With': 'XMLHttpRequest' // PROTECTION 3: CSRF prevention
        },
        credentials: 'include',
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Payment created! Transaction ID: ${data.paymentId}`);
        setAmount('');
        setRecipientAccount('');
        setSwiftCode('');
        // Trigger refresh after short delay
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage(`Error: ${data.message || 'Payment failed'}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setMessage('Network error. Could not connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="component-container">
      <h3>Create International Payment</h3>
      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="amount">Amount:</label>
            <input 
              id="amount"
              type="text" 
              value={amount} 
              onChange={handleAmountChange} 
              required 
              disabled={isLoading}
              placeholder="0.00"
            />
          </div>
          <div className="form-group">
            <label htmlFor="currency">Currency:</label>
            <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={isLoading}>
              <option value="ZAR">ZAR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="account">Recipient Account:</label>
            <input 
              id="account"
              type="text" 
              value={recipientAccount} 
              onChange={handleAccountChange} 
              required 
              disabled={isLoading}
              placeholder="Account number"
              maxLength="17"
            />
          </div>
          <div className="form-group">
            <label htmlFor="swift">SWIFT Code:</label>
            <input 
              id="swift"
              type="text" 
              value={swiftCode} 
              onChange={handleSwiftChange} 
              required 
              disabled={isLoading}
              placeholder="SWIFT code"
              maxLength="11"
            />
          </div>
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Pay Now'}
          </button>
        </form>
        {message && (
          <p className={message.includes('created') ? 'message-success' : 'message-error'}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

export default PaymentForm;