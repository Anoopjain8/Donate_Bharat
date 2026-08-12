import { Link } from 'react-router-dom';
import { useAdminOverview } from '../../hooks/useQueries';
import StatCard from '../../components/ui/StatCard';
import Skeleton from '../../components/ui/Skeleton';
import PageHeader from '../../components/ui/PageHeader';

const ADMIN_LINKS = [
  { to: '/admin/organizations', title: 'Verify Organizations', desc: 'Review and verify payee profiles.' },
  { to: '/admin/users', title: 'Manage Users', desc: 'Activate or deactivate accounts.' },
  { to: '/admin/audit', title: 'Audit Log', desc: 'Full activity trail for compliance.' },
];

export default function AdminOverview() {
  const { data: stats, isLoading } = useAdminOverview();

  return (
    <div>
      <PageHeader title="Admin Overview" subtitle="Platform-wide statistics." />

      {isLoading ? (
        <div className="stats">
          <Skeleton style={{ height: 96 }} />
          <Skeleton style={{ height: 96 }} />
          <Skeleton style={{ height: 96 }} />
          <Skeleton style={{ height: 96 }} />
          <Skeleton style={{ height: 96 }} />
          <Skeleton style={{ height: 96 }} />
          <Skeleton style={{ height: 96 }} />
        </div>
      ) : (
        <div className="stats">
          <StatCard label="Users" value={stats?.users} icon="👥" />
          <StatCard label="Organizations" value={stats?.organizations} icon="🏛️" />
          <StatCard label="Pending Verification" value={stats?.pendingOrganizations} icon="⏳" />
          <StatCard label="Completed Payments" value={stats?.completedPayments} icon="✅" />
          <StatCard label="Total Processed" value={`₹${(stats?.totalProcessed || 0).toLocaleString('en-IN')}`} icon="💰" />
          <StatCard label="Bills Tracked" value={stats?.bills} icon="🗂️" />
          <StatCard label="Last 30 Days" value={`₹${(stats?.last30DaysRevenue || 0).toLocaleString('en-IN')}`} icon="📈" />
        </div>
      )}

      <div className="grid">
        {ADMIN_LINKS.map((l) => (
          <Link key={l.to} to={l.to} className="card quick-link">
            <h3>{l.title}</h3>
            <p>{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
