import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { billAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePayeeDashboard } from '../hooks/useQueries';
import StatCard from '../components/ui/StatCard';
import Skeleton from '../components/ui/Skeleton';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

export default function PayeeDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = usePayeeDashboard();

  const review = async (id, status) => {
    try {
      await billAPI.review(id, { status });
      toast.success(`Bill ${status}`);
      queryClient.invalidateQueries({ queryKey: ['payee', 'dashboard'] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const org = data?.org;
  const bills = data?.bills || [];

  return (
    <div>
      <PageHeader
        title={org ? org.name : 'Payee Dashboard'}
        subtitle={`Welcome, ${user.name}. Review incoming bills and track received payments.`}
      />

      {isLoading ? (
        <>
          <div className="stats">
            <Skeleton style={{ height: 96 }} />
            <Skeleton style={{ height: 96 }} />
            <Skeleton style={{ height: 96 }} />
            <Skeleton style={{ height: 96 }} />
          </div>
          <Skeleton style={{ height: 320, marginTop: 24 }} />
        </>
      ) : !org ? (
        <EmptyState
          icon="🏛️"
          title="You haven't created an organization profile yet"
          subtitle="Create one to start receiving and managing bills."
          action={
            <Link to="/payee/profile" className="btn btn-primary">Create Profile</Link>
          }
        />
      ) : (
        <>
          <div className="stats">
            <StatCard label="Pending Review" value={data.pendingCount} icon="⏳" />
            <StatCard label="Approved" value={data.approvedCount} icon="✅" />
            <StatCard label="Rejected" value={data.rejectedCount} icon="❌" />
            <StatCard label="Total Received" value={`₹${(org.totalReceived || 0).toLocaleString('en-IN')}`} icon="💰" />
          </div>

          <h3 className="section-heading">Recent Bills</h3>
          {bills.length === 0 ? (
            <EmptyState icon="🗂️" title="No bills yet" subtitle="Incoming bills will appear here." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Payer</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((b) => (
                    <tr key={b._id}>
                      <td>{fmt(b.date)}</td>
                      <td>{b.payer?.name || '-'}</td>
                      <td>{b.category}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{(b.amount || 0).toLocaleString('en-IN')}</td>
                      <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                      <td>
                        {b.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-sm btn-sm-success" onClick={() => review(b._id, 'approved')}>Approve</button>
                            <button className="btn-sm btn-sm-danger" onClick={() => review(b._id, 'rejected')}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
