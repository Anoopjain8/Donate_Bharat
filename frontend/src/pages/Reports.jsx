import { useState } from 'react';
import toast from 'react-hot-toast';
import { reportAPI } from '../services/api';

export default function Reports() {
  const [type, setType] = useState('payments');
  const [format, setFormat] = useState('xlsx');
  const [from, setFrom] = useState(new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [sharedUrl, setSharedUrl] = useState('');

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const res = await reportAPI.export({ type, format, from, to });
      const ext = format === 'pdf' ? 'pdf' : format === 'csv' ? 'csv' : 'xlsx';
      downloadBlob(res.data, `${type}-report.${ext}`);
      toast.success('Report downloaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      const res = await reportAPI.share({ type, from, to });
      setSharedUrl(res.data.url);
      toast.success('Share link created (valid 7 days)');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Share failed');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(sharedUrl);
    toast.success('Link copied to clipboard');
  };

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Reports</h1>
        <p>Export your records by period in Excel, PDF or CSV — or share a secure link.</p>
      </div>

      <div className="form-card wide">
        <div className="form-row">
          <div className="form-group">
            <label>Report Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="payments">Payments / Receipts</option>
              <option value="bills">Uploaded Bills</option>
            </select>
          </div>
          <div className="form-group">
            <label>Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={handleExport} disabled={busy}>
            {busy ? 'Generating...' : '⬇ Download Report'}
          </button>
          <button className="btn btn-outline" onClick={handleShare} disabled={busy}>
            🔗 Create Share Link
          </button>
        </div>

        {sharedUrl && (
          <div className="share-box">
            <input readOnly value={sharedUrl} />
            <button className="btn-sm btn-sm-primary" onClick={copyLink}>Copy</button>
            <a href={sharedUrl} target="_blank" rel="noreferrer" className="btn-sm btn-sm-outline">Open</a>
          </div>
        )}

        <p className="help-text" style={{ marginTop: 16 }}>
          Share links are public but read-only, expire after 7 days, and contain no personal contact details.
        </p>
      </div>
    </div>
  );
}
