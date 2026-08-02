import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';

export default function AdminOverview() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminAPI.overview().then((res) => setStats(res.data.overview)).catch(() => {});
  }, []);

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Admin Overview</h1>
        <p>Platform-wide statistics.</p>
      </div>

      {!stats ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="stats">
          <div className="stat"><div className="label">Users</div><div className="value">{stats.users}</div></div>
          <div className="stat"><div className="label">Organizations</div><div className="value">{stats.organizations}</div></div>
          <div className="stat"><div className="label">Pending Verification</div><div className="value">{stats.pendingOrganizations}</div></div>
          <div className="stat"><div className="label">Completed Payments</div><div className="value">{stats.completedPayments}</div></div>
          <div className="stat"><div className="label">Total Processed</div><div className="value">₹{(stats.totalProcessed || 0).toLocaleString('en-IN')}</div></div>
          <div className="stat"><div className="label">Bills Tracked</div><div className="value">{stats.bills}</div></div>
          <div className="stat"><div className="label">Last 30 Days</div><div className="value">₹{(stats.last30DaysRevenue || 0).toLocaleString('en-IN')}</div></div>
        </div>
      )}

      <div className="grid">
        <Link to="/admin/organizations" className="card" style={{ color: 'inherit' }}>
          <h3 style={{ color: 'var(--primary)' }}>Verify Organizations</h3>
          <p style={{ color: 'var(--muted)', marginTop: 6 }}>Review and verify payee profiles.</p>
        </Link>
        <Link to="/admin/users" className="card" style={{ color: 'inherit' }}>
          <h3 style={{ color: 'var(--primary)' }}>Manage Users</h3>
          <p style={{ color: 'var(--muted)', marginTop: 6 }}>Activate or deactivate accounts.</p>
        </Link>
        <Link to="/admin/audit" className="card" style={{ color: 'inherit' }}>
          <h3 style={{ color: 'var(--primary)' }}>Audit Log</h3>
          <p style={{ color: 'var(--muted)', marginTop: 6 }}>Full activity trail for compliance.</p>
        </Link>
      </div>
    </div>
  );
}
