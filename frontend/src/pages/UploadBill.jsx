import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { billAPI, orgAPI, getErrorMessage } from '../services/api';
import { useEffect } from 'react';

export default function UploadBill() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    category: '',
    subType: '',
    department: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    referenceNumber: '',
    organizationId: '',
    notes: '',
  });

  useEffect(() => {
    orgAPI.list({ limit: 50 }).then((res) => setOrgs(res.data.organizations)).catch(() => {});
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFiles = (list) => {
    const selected = Array.from(list).filter((f) => f.type === 'application/pdf' || f.type.startsWith('image/'));
    const oversized = Array.from(list).filter((f) => f.size > 10 * 1024 * 1024);
    if (oversized.length) toast.error('Some files exceed 10MB and were skipped.');
    setFiles((prev) => [...prev, ...selected].slice(0, 5));
  };

  const activeCategory = categories.find((c) => c.name === form.category);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error('Please attach at least one bill file (PDF or image).');
      return;
    }
    setSubmitting(true);
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v) data.append(k, v);
    });
    files.forEach((f) => data.append('files', f));
    try {
      const res = await billAPI.upload(data);
      toast.success('Bill uploaded successfully');
      navigate(`/receipts`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>Upload a Bill</h1>
        <p>Upload any bill, invoice or receipt — PDF or image. No hard copies needed.</p>
      </div>

      <form className="form-card wide" onSubmit={onSubmit}>
        <div className="form-group">
          <label>Bill Files (up to 5, PDF or images, max 10MB each)</label>
          <div
            className={`drag-drop ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => document.getElementById('bill-input').click()}
          >
            <div style={{ fontSize: '2rem' }}>📎</div>
            Drag & drop files here, or click to browse
          </div>
          <input
            id="bill-input"
            type="file"
            hidden
            multiple
            accept=".pdf,image/*"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {files.length > 0 && (
            <div className="file-list">
              {files.map((f, i) => (
                <div className="file-item" key={i}>
                  <span>📄 {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                  <button type="button" className="btn-sm btn-sm-danger" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Category *</label>
            <select name="category" value={form.category} onChange={onChange} required>
              <option value="">Select category...</option>
              {categories.map((c) => (
                <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Sub Type</label>
            <select name="subType" value={form.subType} onChange={onChange}>
              <option value="">Select...</option>
              {(activeCategory?.subTypes || []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Amount (₹) *</label>
            <input type="number" name="amount" value={form.amount} onChange={onChange} required min="0" step="0.01" />
          </div>
          <div className="form-group">
            <label>Date *</label>
            <input type="date" name="date" value={form.date} onChange={onChange} required />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Payee (optional)</label>
            <select name="organizationId" value={form.organizationId} onChange={onChange}>
              <option value="">None / cash payment</option>
              {orgs.map((o) => (
                <option key={o._id} value={o._id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Reference Number</label>
            <input name="referenceNumber" value={form.referenceNumber} onChange={onChange} />
          </div>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea name="notes" value={form.notes} onChange={onChange} placeholder="Optional notes..." />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
          {submitting ? 'Uploading...' : 'Upload Bill'}
        </button>
      </form>
    </div>
  );
}
