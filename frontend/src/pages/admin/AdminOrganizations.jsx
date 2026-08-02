import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState([]);
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchOrgs = (p = 1, s = status) => {
    setLoading(true);
    adminAPI.organizations({ status: s, page: p, limit: 20 }).then((res) => {
      setOrgs(res.data.organizations);
      setPagination(res.data.pagination);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrgs(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const verify = async (id, verified) => {
    try {
      await adminAPI.verifyOrganization(id, verified);
      toast.success(verified ? 'Organization verified' : 'Verification removed');
      fetchOrgs(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Organizations</h1>
        <p>Verify payee organizations so they appear publicly.</p>
      </div>

      <div className="filter-bar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : orgs.length === 0 ? (
        <div className="empty-state"><h3>No organizations found</h3></div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Owner</th>
                  <th>Religion</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o._id}>
                    <td>{o.name}</td>
                    <td>{o.owner?.name || '-'}<div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{o.owner?.email}</div></td>
                    <td>{o.religion}</td>
                    <td>{o.type}</td>
                    <td>
                      {o.verified
                        ? <span className="badge badge-approved">Verified</span>
                        : <span className="badge badge-pending">Pending</span>}
                    </td>
                    <td>
                      {o.verified ? (
                        <button className="btn-sm btn-sm-danger" onClick={() => verify(o._id, false)}>Unverify</button>
                      ) : (
                        <button className="btn-sm btn-sm-success" onClick={() => verify(o._id, true)}>Verify</button>
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
