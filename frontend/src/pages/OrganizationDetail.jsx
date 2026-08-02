import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { orgAPI } from '../services/api';

export default function OrganizationDetail() {
  const { id } = useParams();
  const [org, setOrg] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    orgAPI
      .get(id)
      .then((res) => setOrg(res.data.organization))
      .catch((err) => setError(err.response?.data?.message || 'Organization not found'));
  }, [id]);

  if (error) {
    return (
      <div className="container">
        <div className="empty-state"><h3>{error}</h3></div>
      </div>
    );
  }
  if (!org) return <div className="loading">Loading...</div>;

  const row = (label, value) =>
    value ? (
      <tr>
        <td style={{ fontWeight: 600 }}>{label}</td>
        <td>{value}</td>
      </tr>
    ) : null;

  return (
    <div className="container">
      <Link to="/organizations" className="back-link">← Back to Payees</Link>
      <div className="card" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="org-card-header" style={{ marginBottom: 18 }}>
          <div className="org-avatar" style={{ width: 64, height: 64, fontSize: '1.8rem' }}>{org.name.charAt(0)}</div>
          <div>
            <h1 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{org.name}</h1>
            <div className="tags" style={{ marginTop: 6 }}>
              <span className="tag tag-religion">{org.religion}</span>
              <span className="tag tag-type">{org.type}</span>
              {org.verified && <span className="badge badge-approved">Verified</span>}
            </div>
          </div>
        </div>
        {org.description && <p style={{ marginBottom: 18 }}>{org.description}</p>}
        <table style={{ maxWidth: 520 }}>
          <tbody>
            {row('Address', [org.address?.street, org.address?.city, org.address?.state, org.address?.pincode].filter(Boolean).join(', '))}
            {row('Registration No.', org.registrationNo)}
            {row('PAN', org.panNumber)}
            {row('Website', org.website)}
            {row('Email', org.email)}
            {row('Phone', org.phone)}
            {row('Total Received', `₹${(org.totalReceived || 0).toLocaleString('en-IN')}`)}
          </tbody>
        </table>
        <div style={{ marginTop: 20 }}>
          <Link to={`/donate/${org._id}`} className="btn btn-accent">Make a Payment</Link>
        </div>
      </div>
    </div>
  );
}
