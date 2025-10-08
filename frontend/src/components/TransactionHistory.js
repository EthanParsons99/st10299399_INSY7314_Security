import React, { useState, useEffect } from 'react';

function TransactionHistory() {
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPayments = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You are not logged in.');
        return;
      }

      try {
        const response = await fetch('https://localhost:3000/post', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPayments(data);
        } else {
          const errData = await response.json();
          setError(errData.message || 'Failed to fetch transaction history.');
        }
      } catch (err) {
        setError('Network error. Could not fetch transactions.');
      }
    };

    fetchPayments();
  }, []); // The empty array [] means this effect runs once when the component mounts

  return (
    <div className="component-container">
      <h3>Transaction History</h3>
      {error && <p className="message-error">{error}</p>}
      {!error && payments.length === 0 && <p>No transactions found.</p>}
      {!error && payments.length > 0 && (
        <table className="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Recipient Account</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment._id}>
                <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                <td>{payment.amount.toFixed(2)}</td>
                <td>{payment.currency}</td>
                <td>{payment.recipientAccount}</td>
                <td><span className={`status status-${payment.status}`}>{payment.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default TransactionHistory;