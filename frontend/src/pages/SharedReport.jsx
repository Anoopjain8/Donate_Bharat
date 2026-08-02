import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reportAPI } from '../services/api';

export default function SharedReport() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    reportAPI
      .shared(token)
      .then((res) => setReport(res.data.report))
      .catch((err) => setError(err.response?.data?.message || 'Share link is invalid or expired'));
  }, [token]);

  if (error) {
    return (
      <div className="container">
        <div className="empty-state"><h3>{error}</h3></div>
      </div>
    );
  }
  if (!report) return <div className="loading">Loading...</div>;

  const keys = report.rows?.length ? Object.keys(report.rows[0]) : [];

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>{report.title}</h1>
        <p>
          Period: {new Date(report.from).toLocaleDateString('en-IN')} — {new Date(report.to).toLocaleDateString('en-IN')}
          {'  ·  '}Shared on {new Date(report.createdAt).toLocaleDateString('en-IN')}
        </p>
      </div>

      {report.rows?.length === 0 ? (
        <div className="empty-state"><h3>No records in this period</h3></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {keys.map((k) => <th key={k}>{k}</th>)}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row, i) => (
                <tr key={i}>
                  {keys.map((k) => <td key={k}>{row[k] ?? '-'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
