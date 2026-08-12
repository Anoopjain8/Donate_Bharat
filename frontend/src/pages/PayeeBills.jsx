import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { billAPI, fileUrl, fileDownloadUrl } from '../services/api';

export default function PayeeBills() {
  const [bills, setBills] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBills = (p = 1) => {
    setLoading(true);
    const params = { page: p, limit: 20 };
    if (status) params.status = status;
    billAPI.orgList(params).then((res) => {
      setBills(res.data.bills);
      setPagination(res.data.pagination);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBills(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const review = async (id, s) => {
    try {
      await billAPI.review(id, { status: s });
      toast.success(`Bill ${s}`);
      fetchBills(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Incoming Bills</h1>
        <p>Review and verify bills uploaded by payers.</p>
      </div>

      <div className="filter-bar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : bills.length === 0 ? (
        <div className="empty-state"><h3>No bills found</h3></div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Payer</th>
                  <th>Category</th>
                  <th>Reference</th>
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
                    <td>{b.payer?.name || '-'}<div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{b.payer?.email}</div></td>
                    <td>
                      {b.category}
                      {b.subType && <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{b.subType}</div>}
                    </td>
                    <td>{b.referenceNumber || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{(b.amount || 0).toLocaleString('en-IN')}</td>
                    <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {b.files.map((f, i) => (
                          <div key={i} style={{ display: 'flex', gap: 4 }}>
                            <a href={fileUrl(f.key)} target="_blank" rel="noreferrer" className="btn-sm btn-sm-outline">
                              {f.name?.slice(0, 12)}…
                            </a>
                            <a href={fileDownloadUrl(f.key)} className="btn-sm btn-sm-outline" title="Download original file">Save</a>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      {b.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-sm btn-sm-success" onClick={() => review(b._id, 'approved')}>✓</button>
                          <button className="btn-sm btn-sm-danger" onClick={() => review(b._id, 'rejected')}>✗</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button className="btn-sm btn-sm-outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {pagination.totalPages}</span>
              <button className="btn-sm btn-sm-outline" disabled={page === pagination.totalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
