import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { billAPI, orgAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function PayerDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState({ totals: { count: 0, total: 0 }, byCategory: [], byMonth: [] });
  const [orgCount, setOrgCount] = useState(0);

  useEffect(() => {
    billAPI.summary().then((res) => setSummary(res.data)).catch(() => {});
    orgAPI.list({ limit: 1 }).then((res) => setOrgCount(res.data.pagination?.total || 0)).catch(() => {});
  }, []);

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Welcome, {user.name}</h1>
        <p>Track your bills, payments and receipts in one place.</p>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="label">Bills Tracked</div>
          <div className="value">{summary.totals.count}</div>
        </div>
        <div className="stat">
          <div className="label">Total Amount</div>
          <div className="value">₹{(summary.totals.total || 0).toLocaleString('en-IN')}</div>
        </div>
        <div className="stat">
          <div className="label">Verified Payees</div>
          <div className="value">{orgCount}</div>
        </div>
      </div>

      <div className="grid" style={{ marginBottom: 28 }}>
        <Link to="/upload" className="card" style={{ color: 'inherit', transition: 'box-shadow .15s' }}>
          <div style={{ fontSize: '2rem' }}>📄</div>
          <h3 style={{ color: 'var(--primary)', margin: '8px 0' }}>Upload a Bill</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Upload a PDF or image of any bill or receipt.</p>
        </Link>
        <Link to="/receipts" className="card" style={{ color: 'inherit' }}>
          <div style={{ fontSize: '2rem' }}>🗂️</div>
          <h3 style={{ color: 'var(--primary)', margin: '8px 0' }}>My Bills & Receipts</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Browse, filter and download your records.</p>
        </Link>
        <Link to="/organizations" className="card" style={{ color: 'inherit' }}>
          <div style={{ fontSize: '2rem' }}>🕉️</div>
          <h3 style={{ color: 'var(--primary)', margin: '8px 0' }}>Pay a Payee</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Pay verified organizations securely online.</p>
        </Link>
        <Link to="/reports" className="card" style={{ color: 'inherit' }}>
          <div style={{ fontSize: '2rem' }}>📊</div>
          <h3 style={{ color: 'var(--primary)', margin: '8px 0' }}>Reports</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Export Excel / PDF reports for any period.</p>
        </Link>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <h3 style={{ color: 'var(--primary)', marginBottom: 12 }}>By Category</h3>
          {summary.byCategory.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No data yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.byCategory.slice(0, 6).map((c) => (
                  <tr key={c._id}>
                    <td>{c._id}</td>
                    <td style={{ textAlign: 'right' }}>₹{(c.total || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--primary)', marginBottom: 12 }}>Monthly Trend</h3>
          {summary.byMonth.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No data yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {summary.byMonth.slice(-6).reverse().map((m) => (
                  <tr key={m._id}>
                    <td>{m._id}</td>
                    <td style={{ textAlign: 'right' }}>₹{(m.total || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
