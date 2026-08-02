import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orgAPI } from '../services/api';

const CATEGORIES = [
  { icon: '🛕', name: 'Religious Donations', desc: 'Temples, mosques, churches, gurdwaras, and trusts' },
  { icon: '🏢', name: 'Municipal Corporation', desc: 'Property tax, water tax, trade license' },
  { icon: '🚗', name: 'Vehicle Payments', desc: 'Challans, road tax, insurance, PUC' },
  { icon: '⚡', name: 'Utility Bills', desc: 'Electricity, gas, water, internet' },
  { icon: '💰', name: 'Tax Payments', desc: 'Income tax, GST, advance tax' },
  { icon: '🚨', name: 'Fines & Penalties', desc: 'Court fines, RTI fees, penalties' },
];

export default function Landing() {
  const [orgs, setOrgs] = useState([]);

  useEffect(() => {
    orgAPI
      .list({ limit: 6 })
      .then((res) => setOrgs(res.data.organizations))
      .catch(() => {});
  }, []);

  return (
    <div>
      <section className="hero">
        <h1>Every Bill, Every Receipt, One Home</h1>
        <p>
          Go paperless. Upload your bills and receipts, make secure online payments, and receive
          automated digital receipts — all stored in one place, ready for reporting and tax filing.
        </p>
        <div className="hero-buttons">
          <Link to="/register" className="hero-btn hero-btn-white">Get Started Free</Link>
          <Link to="/organizations" className="hero-btn hero-btn-outline">Browse Payees</Link>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">No more hard copies. Everything digital.</p>
        <div className="how-it-works">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Create Your Account</h3>
            <p>Sign up as a Payer to track bills, or as a Payee to receive and manage payments.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Upload or Pay Online</h3>
            <p>Snap or upload any bill — electricity, tax, donation — or pay securely via UPI/cards.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Get Receipts Automatically</h3>
            <p>Online payments generate digital receipts instantly. Export reports in Excel or PDF.</p>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: '#fff' }}>
        <h2 className="section-title">Track Any Payment</h2>
        <p className="section-subtitle">From donations to taxes to fines — categorized automatically</p>
        <div className="how-it-works">
          {CATEGORIES.map((c) => (
            <div className="step-card" key={c.name}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>{c.icon}</div>
              <h3>{c.name}</h3>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {orgs.length > 0 && (
        <section className="section">
          <h2 className="section-title">Featured Payees</h2>
          <p className="section-subtitle">Verified organizations you can support today</p>
          <div className="grid">
            {orgs.map((org) => (
              <div className="card org-card" key={org._id}>
                <div className="org-card-header">
                  <div className="org-avatar">{org.name.charAt(0)}</div>
                  <div>
                    <h3>{org.name}</h3>
                  </div>
                </div>
                <div className="tags">
                  <span className="tag tag-religion">{org.religion}</span>
                  <span className="tag tag-type">{org.type}</span>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                  {org.description?.slice(0, 120) || 'Verified organization.'}
                </p>
                <div className="org-card-footer">
                  <span className="amount">₹{org.totalReceived?.toLocaleString('en-IN') || '0'} received</span>
                  <Link to={`/donate/${org._id}`} className="btn-sm btn-sm-primary">Pay</Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="footer">
        Donate Bharat &copy; {new Date().getFullYear()} — Paperless payments &amp; record-keeping for everyone.
      </footer>
    </div>
  );
}
