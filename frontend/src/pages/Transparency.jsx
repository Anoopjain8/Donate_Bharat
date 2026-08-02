import { useEffect, useState } from 'react';
import { orgAPI } from '../services/api';

export default function Transparency() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orgAPI
      .list({ limit: 200 })
      .then((res) => setOrgs(res.data.organizations))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total = orgs.reduce((s, o) => s + (o.totalReceived || 0), 0);

  const byReligion = {};
  orgs.forEach((o) => {
    if (!byReligion[o.religion]) byReligion[o.religion] = { count: 0, total: 0 };
    byReligion[o.religion].count += 1;
    byReligion[o.religion].total += o.totalReceived || 0;
  });

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Payment Transparency Portal</h1>
        <p>Public record of verified organizations and funds received</p>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="label">Verified Payees</div>
          <div className="value">{orgs.length}</div>
        </div>
        <div className="stat">
          <div className="label">Total Received</div>
          <div className="value">₹{(total || 0).toLocaleString('en-IN')}</div>
        </div>
        <div className="stat">
          <div className="label">Faiths Represented</div>
          <div className="value">{Object.keys(byReligion).length}</div>
        </div>
      </div>

      <h3 style={{ color: 'var(--primary)', marginBottom: 14 }}>By Religion</h3>
      <div className="grid" style={{ marginBottom: 28 }}>
        {Object.entries(byReligion).map(([religion, data]) => (
          <div className="card" key={religion}>
            <h4 style={{ color: 'var(--primary)' }}>{religion}</h4>
            <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: '0.9rem' }}>
              {data.count} organizations
            </div>
            <div style={{ fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>
              ₹{(data.total || 0).toLocaleString('en-IN')}
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ color: 'var(--primary)', marginBottom: 14 }}>By Organization</h3>
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Organization</th>
                <th>Religion</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Received</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o._id}>
                  <td>{o.name}</td>
                  <td>{o.religion}</td>
                  <td>{o.type}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{(o.totalReceived || 0).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
