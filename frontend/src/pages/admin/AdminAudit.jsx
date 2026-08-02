import { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchLogs = (p = 1) => {
    setLoading(true);
    adminAPI.auditLogs({ page: p, limit: 30 }).then((res) => {
      setLogs(res.data.logs);
      setPagination(res.data.pagination);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs(page);
  }, [page]);

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Audit Log</h1>
        <p>Complete activity trail for compliance and security.</p>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="empty-state"><h3>No activity yet</h3></div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l._id}>
                    <td>{new Date(l.createdAt).toLocaleString('en-IN')}</td>
                    <td>{l.actor?.name || 'System'}</td>
                    <td><code>{l.action}</code></td>
                    <td>{l.resource}</td>
                    <td>{l.ip}</td>
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
