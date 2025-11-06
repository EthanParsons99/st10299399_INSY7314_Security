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
        const response = await fetch('https://localhost:3000/post', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Requested-With': 'XMLHttpRequest'
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          // Sort data by newest first before setting state
          data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

          // Your XSS protection is great, let's keep it.
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

  if (isLoading) return <div className="component-container"><p>Loading transaction history...</p></div>;

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
              {/* --- 1. THE STATUS HEADER IS CONFIRMED PRESENT --- */}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment._id}>
                <td>{new Date(payment.createdAt).toLocaleDateString()}</td>
                <td>{payment.amount.toFixed(2)}</td>
                <td>{payment.currency}</td>
                {/* Your .replace() is smart, but React handles this automatically with JSX.
                    However, to render it as HTML if needed, we use dangerouslySetInnerHTML */}
                <td dangerouslySetInnerHTML={{ __html: payment.recipientAccount }} />
                
                {/* --- 2. THE STATUS BADGE LOGIC IS CONFIRMED PRESENT AND CORRECT --- */}
                <td>
                  <span className={`status status-${payment.status}`}>
                    {payment.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default TransactionHistory;