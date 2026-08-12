import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    authAPI
      .verifyEmail(token)
      .then(() => {
        setStatus('success');
        toast.success('Email verified!');
      })
      .catch(() => {
        setStatus('invalid');
      });
  }, [token]);

  return (
    <div className="container" style={{ maxWidth: 480 }}>
      <div className="form-card">
        <h2>Email Verification</h2>
        {status === 'verifying' && <p className="subtitle">Verifying your email address...</p>}
        {status === 'success' && (
          <>
            <p className="subtitle">
              Your email has been verified. You can now create an organization profile.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center' }}>
              Continue to Login
            </Link>
          </>
        )}
        {status === 'invalid' && (
          <>
            <p className="subtitle">
              This verification link is invalid or has expired. Please sign in to resend it.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ display: 'block', textAlign: 'center' }}>
              Go to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
