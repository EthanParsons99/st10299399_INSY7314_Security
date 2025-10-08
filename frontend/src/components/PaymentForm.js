import React, { useState } from 'react';

function PaymentForm() {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('ZAR');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('Authentication error. Please log in again.');
      return;
    }

    const paymentData = {
      amount: parseFloat(amount),
      currency,
      provider: 'SWIFT',
      recipientAccount,
      swiftCode,
    };

    try {
      const response = await fetch('https://localhost:3000/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`Payment created! Transaction ID: ${data.paymentId}`);
        setAmount('');
        setRecipientAccount('');
        setSwiftCode('');
        // NOTE: In a real app, you'd trigger a refresh of the transaction history here.
        // For this project, a page refresh will show the new transaction.
        window.location.reload(); 
      } else {
        setMessage(`Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setMessage('Network error. Could not connect to the server.');
    }
  };

  return (
    <div className="component-container">
      <h3>Create International Payment</h3>
      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Amount:</label>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Currency:</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="ZAR">ZAR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <div className="form-group">
            <label>Recipient Account:</label>
            <input type="text" value={recipientAccount} onChange={(e) => setRecipientAccount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>SWIFT Code:</label>
            <input type="text" value={swiftCode} onChange={(e) => setSwiftCode(e.target.value)} required />
          </div>
          <button type="submit">Pay Now</button>
        </form>
        {message && <p className={message.includes('created') ? 'message-success' : 'message-error'}>{message}</p>}
      </div>
    </div>
  );
}

export default PaymentForm;