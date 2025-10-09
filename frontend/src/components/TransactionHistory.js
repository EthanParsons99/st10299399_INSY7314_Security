import React, { useState, useEffect } from 'react';

function TransactionHistory() {
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      const token = sessionStorage.getItem('token');
      if (!token) {
        setError('You are not logged in.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/post', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          // PROTECTION: Sanitize displayed data to prevent XSS
          setPayments(data.map(p => ({
            ...p,
            recipientAccount: p.recipientAccount.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
            swiftCode: p.swiftCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')
          })));
        } else {
          const errData = await response.json();
          setError(errData.message || 'Failed to fetch transactions.');
        }
      } catch (err) {
        setError('Network error. Could not fetch transactions.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, []);

  if (isLoading) return <div className="component-container"><p>Loading...</p></div>;

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
