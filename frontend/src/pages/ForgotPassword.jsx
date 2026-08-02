import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="form-card">
        <h2>Reset Password</h2>
        {sent ? (
          <>
            <p className="subtitle">If an account exists for that email, a reset link has been sent. Check your inbox.</p>
            <Link to="/login" className="btn btn-outline" style={{ width: '100%', display: 'block', textAlign: 'center' }}>Back to Login</Link>
          </>
        ) : (
          <>
            <p className="subtitle">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={onSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
