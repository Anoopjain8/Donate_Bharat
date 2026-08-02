import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { orgAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'];
const TYPES = ['Temple', 'Church', 'Mosque', 'Gurdwara', 'Charity', 'NGO', 'Government Department', 'Other'];

const BLANK = {
  name: '',
  religion: '',
  type: '',
  description: '',
  registrationNo: '',
  panNumber: '',
  website: '',
  email: '',
  phone: '',
  address: { street: '', city: '', state: '', pincode: '' },
};

export default function PayeeProfile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState(BLANK);
  const [existing, setExisting] = useState(null);
  const [logo, setLogo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orgAPI
      .mine()
      .then((res) => {
        setExisting(res.data.organization);
        const o = res.data.organization;
        setForm({
          name: o.name || '',
          religion: o.religion || '',
          type: o.type || '',
          description: o.description || '',
          registrationNo: o.registrationNo || '',
          panNumber: o.panNumber || '',
          website: o.website || '',
          email: o.email || '',
          phone: o.phone || '',
          address: o.address || BLANK.address,
        });
      })
      .catch(() => setExisting(null))
      .finally(() => setLoading(false));
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const onAddress = (e) => setForm({ ...form, address: { ...form.address, [e.target.name]: e.target.value } });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k === 'address') {
        Object.entries(v).forEach(([ak, av]) => av && data.append(`address[${ak}]`, av));
      } else if (v) {
        data.append(k, v);
      }
    });
    if (logo) data.append('logo', logo);

    try {
      const res = existing ? await orgAPI.update(data) : await orgAPI.create(data);
      setExisting(res.data.organization);
      if (!existing && user.role === 'payee') updateUser({ role: 'payee' });
      toast.success(existing ? 'Profile updated' : 'Profile created — pending verification');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.details?.[0]?.message || 'Save failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      <div className="dashboard-header">
        <h1>{existing ? 'Organization Profile' : 'Create Organization Profile'}</h1>
        <p>
          {existing?.verified
            ? 'Your profile is verified and visible to payers.'
            : 'Your profile is pending admin verification before it appears publicly.'}
        </p>
      </div>

      <form className="form-card wide" onSubmit={onSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label>Organization Name *</label>
            <input name="name" value={form.name} onChange={onChange} required minLength={2} />
          </div>
          <div className="form-group">
            <label>Religion *</label>
            <select name="religion" value={form.religion} onChange={onChange} required>
              <option value="">Select...</option>
              {RELIGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Type *</label>
            <select name="type" value={form.type} onChange={onChange} required>
              <option value="">Select...</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Logo (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files[0] || null)} />
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea name="description" value={form.description} onChange={onChange} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Registration No.</label>
            <input name="registrationNo" value={form.registrationNo} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>PAN Number</label>
            <input name="panNumber" value={form.panNumber} onChange={onChange} placeholder="AAAAA0000A" maxLength={10} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Website</label>
            <input name="website" value={form.website} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={form.email} onChange={onChange} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Phone</label>
            <input name="phone" value={form.phone} onChange={onChange} />
          </div>
          <div className="form-group">
            <label>Pincode</label>
            <input name="pincode" value={form.address.pincode} onChange={onAddress} />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Street</label>
            <input name="street" value={form.address.street} onChange={onAddress} />
          </div>
          <div className="form-group">
            <label>City / State</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input name="city" value={form.address.city} onChange={onAddress} placeholder="City" />
              <input name="state" value={form.address.state} onChange={onAddress} placeholder="State" />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
          {submitting ? 'Saving...' : existing ? 'Update Profile' : 'Create Profile'}
        </button>
      </form>
    </div>
  );
}
