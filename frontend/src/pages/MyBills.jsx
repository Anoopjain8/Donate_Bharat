import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { billAPI, fileUrl } from '../services/api';

const CATEGORY_FILTERS = [
  'Religious Donation', 'Municipal Corporation', 'Vehicle', 'Income Tax',
  'GST', 'Utility Bills', 'Education', 'Fine/Penalty', 'Other',
];

export default function MyBills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchBills = () => {
    setLoading(true);
    const params = { limit: 50 };
    if (category) params.category = category;
    if (status) params.status = status;
    if (from) params.from = from;
    if (to) params.to = to;
    billAPI
      .mine(params)
      .then((res) => setBills(res.data.bills))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, status, from, to]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this bill record?')) return;
    try {
      await billAPI.remove(id);
      toast.success('Bill deleted');
      fetchBills();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const downloadCsv = async () => {
    try {
      const res = await billAPI.exportCsv({});
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-bills.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>My Bills & Receipts</h1>
        <p>All your uploaded bills and auto-generated receipts in one place.</p>
        <button className="btn-sm btn-sm-outline" style={{ marginTop: 10 }} onClick={downloadCsv}>
          ⬇ Export CSV
        </button>
      </div>

      <div className="filter-bar">
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORY_FILTERS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} title="From" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} title="To" />
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : bills.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🗂️</div>
          <h3>No bills found</h3>
          <p><Link to="/upload">Upload your first bill</Link></p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Payee</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Status</th>
                <th>Files</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b._id}>
                  <td>{fmt(b.date)}</td>
                  <td>{b.organizationName || '-'}</td>
                  <td>
                    {b.category}
                    {b.subType && <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{b.subType}</div>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{(b.amount || 0).toLocaleString('en-IN')}</td>
                  <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {b.files.map((f, i) => (
                        <a key={i} href={fileUrl(f.key)} target="_blank" rel="noreferrer" className="btn-sm btn-sm-outline">
                          {f.name?.slice(0, 16)}…
                        </a>
                      ))}
                    </div>
                  </td>
                  <td>
                    <button className="btn-sm btn-sm-danger" onClick={() => handleDelete(b._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
