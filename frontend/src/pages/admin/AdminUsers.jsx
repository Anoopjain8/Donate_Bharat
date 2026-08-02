import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '../../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const fetchUsers = (p = 1) => {
    setLoading(true);
    adminAPI.users({ page: p, limit: 20 }).then((res) => {
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  const toggle = async (id, isActive) => {
    try {
      await adminAPI.toggleUser(id, isActive);
      toast.success(isActive ? 'User activated' : 'User deactivated');
      fetchUsers(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Users</h1>
        <p>Manage platform accounts.</p>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className="badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>{u.role}</span></td>
                    <td>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      {u.isActive
                        ? <span className="badge badge-approved">Active</span>
                        : <span className="badge badge-rejected">Disabled</span>}
                    </td>
                    <td>
                      {u.role !== 'admin' && (
                        u.isActive ? (
                          <button className="btn-sm btn-sm-danger" onClick={() => toggle(u._id, false)}>Disable</button>
                        ) : (
                          <button className="btn-sm btn-sm-success" onClick={() => toggle(u._id, true)}>Enable</button>
                        )
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
