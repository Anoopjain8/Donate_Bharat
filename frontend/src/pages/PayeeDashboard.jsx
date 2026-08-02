import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { billAPI, orgAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function PayeeDashboard() {
  const { user } = useAuth();
  const [org, setOrg] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [bills, setBills] = useState([]);

  const load = () => {
    orgAPI.mine().then((res) => setOrg(res.data.organization)).catch(() => setOrg(null));
    billAPI.orgList({ limit: 6 }).then((res) => {
      setBills(res.data.bills);
      setPendingCount(res.data.pendingCount);
      setApprovedCount(res.data.approvedCount);
      setRejectedCount(res.data.rejectedCount);
    }).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const review = async (id, status) => {
    try {
      await billAPI.review(id, { status });
      toast.success(`Bill ${status}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>{org ? org.name : 'Payee Dashboard'}</h1>
        <p>Welcome, {user.name}. Review incoming bills and track received payments.</p>
      </div>

      {!org && (
        <div className="empty-state">
          <div className="icon">🏛️</div>
          <h3>You haven't created an organization profile yet</h3>
          <p>Create one to start receiving and managing bills.</p>
          <Link to="/payee/profile" className="btn btn-primary">Create Profile</Link>
        </div>
      )}

      {org && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="label">Pending Review</div>
              <div className="value">{pendingCount}</div>
            </div>
            <div className="stat">
              <div className="label">Approved</div>
              <div className="value">{approvedCount}</div>
            </div>
            <div className="stat">
              <div className="label">Rejected</div>
              <div className="value">{rejectedCount}</div>
            </div>
            <div className="stat">
              <div className="label">Total Received</div>
              <div className="value">₹{(org.totalReceived || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>

          <h3 style={{ color: 'var(--primary)', margin: '20px 0 14px' }}>Recent Bills</h3>
          {bills.length === 0 ? (
            <div className="empty-state"><h3>No bills yet</h3></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Payer</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b._id}>
                      <td>{fmt(b.date)}</td>
                      <td>{b.payer?.name || '-'}</td>
                      <td>{b.category}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{(b.amount || 0).toLocaleString('en-IN')}</td>
                      <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                      <td>
                        {b.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-sm btn-sm-success" onClick={() => review(b._id, 'approved')}>Approve</button>
                            <button className="btn-sm btn-sm-danger" onClick={() => review(b._id, 'rejected')}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
