import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { orgAPI } from '../services/api';

const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];
const TYPES = ['Temple', 'Church', 'Mosque', 'Gurdwara', 'Charity', 'NGO', 'Government Department', 'Other'];

export default function BrowseOrganizations() {
  const [params] = useSearchParams();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [religion, setReligion] = useState(params.get('religion') || '');
  const [type, setType] = useState(params.get('type') || '');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  const fetchOrgs = (p = 1, filters = {}) => {
    setLoading(true);
    const query = { page: p, limit: 12 };
    if (filters.search) query.search = filters.search;
    if (filters.religion) query.religion = filters.religion;
    if (filters.type) query.type = filters.type;
    orgAPI
      .list(query)
      .then((res) => {
        setOrgs(res.data.organizations);
        setPagination(res.data.pagination);
      })
      .catch(() => setOrgs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrgs(1, { search, religion, type });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [religion, type]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrgs(1, { search, religion, type });
  };

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Browse Payees</h1>
        <p>Verified temples, mosques, churches, gurdwaras, NGOs and departments</p>
      </div>

      <div className="filter-bar">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 220 }}
          />
        </form>
        <select value={religion} onChange={(e) => { setReligion(e.target.value); setPage(1); }}>
          <option value="">All Religions</option>
          {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading payees...</div>
      ) : orgs.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🔍</div>
          <h3>No payees found</h3>
          <p>Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
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
                  {org.address?.city ? `${org.address.city}, ${org.address.state}` : 'Verified organization.'}
                </p>
                <div className="org-card-footer">
                  <span className="amount">₹{org.totalReceived?.toLocaleString('en-IN') || '0'} received</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link to={`/organizations/${org._id}`} className="btn-sm btn-sm-outline">View</Link>
                    <Link to={`/donate/${org._id}`} className="btn-sm btn-sm-primary">Pay</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button className="btn-sm btn-sm-outline" disabled={page === 1} onClick={() => { setPage(page - 1); fetchOrgs(page - 1, { search, religion, type }); }}>
                Previous
              </button>
              <span>Page {page} of {pagination.totalPages}</span>
              <button
                className="btn-sm btn-sm-outline"
                disabled={page === pagination.totalPages}
                onClick={() => { setPage(page + 1); fetchOrgs(page + 1, { search, religion, type }); }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
