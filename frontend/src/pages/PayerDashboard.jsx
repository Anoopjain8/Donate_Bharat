import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBillsSummary, useOrgCount } from '../hooks/useQueries';
import StatCard from '../components/ui/StatCard';
import Skeleton from '../components/ui/Skeleton';
import PageHeader from '../components/ui/PageHeader';

const PALETTE = ['#1a3a5c', '#2b5c8a', '#e8a13c', '#16a34a', '#7c3aed', '#d97706'];

const QUICK_ACTIONS = [
  { to: '/upload', icon: '📄', title: 'Upload a Bill', desc: 'Upload a PDF or image of any bill or receipt.' },
  { to: '/receipts', icon: '🗂️', title: 'My Bills & Receipts', desc: 'Browse, filter and download your records.' },
  { to: '/organizations', icon: '🕉️', title: 'Pay a Payee', desc: 'Pay verified organizations securely online.' },
  { to: '/reports', icon: '📊', title: 'Reports', desc: 'Export Excel / PDF reports for any period.' },
];

export default function PayerDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { data: summary, isLoading } = useBillsSummary();
  const { data: orgCount, isLoading: countLoading } = useOrgCount();

  const totals = summary?.totals || { count: 0, total: 0 };
  const byCategory = summary?.byCategory || [];
  const byMonth = (summary?.byMonth || []).slice(-6);

  const dark = theme === 'dark';
  const tooltipStyle = {
    background: dark ? '#1e293b' : '#fff',
    border: `1px solid ${dark ? '#334155' : '#e5e7eb'}`,
    borderRadius: 8,
    fontSize: 13,
    color: dark ? '#e2e8f0' : '#1f2937',
  };
  const axisStroke = dark ? '#94a3b8' : '#6b7280';
  const gridStroke = dark ? '#334155' : '#e5e7eb';

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user.name}`}
        subtitle="Track your bills, payments and receipts in one place."
      />

      <div className="stats">
        {isLoading || countLoading ? (
          <>
            <Skeleton style={{ height: 96 }} />
            <Skeleton style={{ height: 96 }} />
            <Skeleton style={{ height: 96 }} />
          </>
        ) : (
          <>
            <StatCard label="Bills Tracked" value={totals.count} icon="🗂️" />
            <StatCard label="Total Amount" value={`₹${(totals.total || 0).toLocaleString('en-IN')}`} icon="💰" />
            <StatCard label="Verified Payees" value={orgCount || 0} icon="🏛️" />
          </>
        )}
      </div>

      <div className="grid" style={{ marginBottom: 28 }}>
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.to} to={a.to} className="card quick-link">
            <div className="quick-link-icon">{a.icon}</div>
            <h3>{a.title}</h3>
            <p>{a.desc}</p>
          </Link>
        ))}
      </div>

      <div className="grid charts-grid">
        <div className="card chart-card">
          <h3 className="card-title">By Category</h3>
          {isLoading ? (
            <Skeleton style={{ height: 260 }} />
          ) : byCategory.length === 0 ? (
            <div className="chart-empty">No data yet.</div>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory.map((c) => ({ name: c._id, value: c.total }))}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={92}
                    paddingAngle={2}
                  >
                    {byCategory.map((c, i) => (
                      <Cell key={c._id} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card chart-card">
          <h3 className="card-title">Monthly Trend</h3>
          {isLoading ? (
            <Skeleton style={{ height: 260 }} />
          ) : byMonth.length === 0 ? (
            <div className="chart-empty">No data yet.</div>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="_id" stroke={axisStroke} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke={axisStroke}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}
                    formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Amount']}
                  />
                  <Bar dataKey="total" fill="#2b5c8a" radius={[6, 6, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
