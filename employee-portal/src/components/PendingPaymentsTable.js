import React, { useState, useEffect, useCallback } from 'react';

function PendingPaymentsTable() {
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const token = sessionStorage.getItem('employeeToken');

    try {
      const response = await fetch('https://localhost:3000/employee/payments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 403) {
        throw new Error('Forbidden: You do not have permission to view this data.');
      }
      if (!response.ok) {
        throw new Error('Failed to fetch payments. The API endpoint may not be ready.');
      }
      
      const data = await response.json();
      setPayments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleUpdateStatus = async (paymentId, newStatus) => {
    const token = sessionStorage.getItem('employeeToken');
    // Optimistic UI update: remove the payment from the list immediately
    setPayments(prevPayments => prevPayments.filter(p => p._id !== paymentId));

    try {
      const response = await fetch(`https://localhost:3000/employee/payments/${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status. Reverting changes.');
      }
    } catch (err) {
      setError(err.message);
      // If the API call fails, refresh the data to bring back the removed payment
      fetchPayments();
    }
  };

  if (isLoading) return <p>Loading pending payments...</p>;
  if (error) return <p className="message-error">{error}</p>;

  return (
    <div className="component-container">
      <h3>Pending Customer Payments</h3>
      {payments.length === 0 ? (
        <p>No pending payments to review.</p>
      ) : (
        <table className="transaction-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Currency</th>
              <th>Recipient Account</th>
              <th>SWIFT Code</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p._id}>
                <td>{p.owner}</td>
                <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                <td>{p.amount.toFixed(2)}</td>
                <td>{p.currency}</td>
                <td>{p.recipientAccount}</td>
                <td>{p.swiftCode}</td>
                <td className="actions-cell">
                  <button onClick={() => handleUpdateStatus(p._id, 'approved')} className="btn-action btn-approve">Approve</button>
                  <button onClick={() => handleUpdateStatus(p._id, 'rejected')} className="btn-action btn-reject">Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default PendingPaymentsTable;