import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { orgAPI, paymentAPI, fileUrl } from '../services/api';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function PayNow() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    orgAPI.get(orgId).then((res) => setOrg(res.data.organization)).catch(() => {});
  }, [orgId]);

  const verify = async (data, paymentId) => {
    try {
      const res = await paymentAPI.verify(data);
      toast.success('Payment successful! Digital receipt generated.');
      navigate(`/receipts`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt < 1) {
      toast.error('Enter a valid amount (min ₹1).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await paymentAPI.createOrder({ organizationId: orgId, amount: amt, purpose, paymentMode });

      if (res.data.demo) {
        if (window.confirm(`Demo mode: confirm a simulated payment of ₹${amt.toLocaleString('en-IN')} to ${org.name}?`)) {
          await verify({ paymentId: res.data.paymentId }, 'pay_demo');
        }
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Could not load payment gateway. Try again.');
        return;
      }

      const options = {
        key: res.data.keyId,
        amount: res.data.order.amount,
        currency: res.data.order.currency,
        name: 'Donate Bharat',
        description: purpose || `Payment to ${org.name}`,
        order_id: res.data.order.id,
        prefill: { name: 'Donor', email: 'donor@example.com' },
        handler: (response) => {
          verify(
            {
              paymentId: res.data.paymentId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              razorpayOrderId: response.razorpay_order_id,
            },
            response.razorpay_payment_id
          );
        },
        modal: { ondismiss: () => setSubmitting(false) },
        theme: { color: '#1a3a5c' },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!org) return <div className="loading">Loading...</div>;

  return (
    <div className="container">
      <Link to={`/organizations/${org._id}`} className="back-link">← Back to {org.name}</Link>
      <div className="form-card">
        <h2>Pay {org.name}</h2>
        <p className="subtitle">Secure online payment via Razorpay. A digital receipt is generated instantly.</p>
        <div className="tags" style={{ marginBottom: 18 }}>
          <span className="tag tag-religion">{org.religion}</span>
          <span className="tag tag-type">{org.type}</span>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Amount (₹)</label>
            <input type="number" min="1" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="e.g. 500" />
          </div>
          <div className="form-group">
            <label>Purpose</label>
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Monthly donation" />
          </div>
          <div className="form-group">
            <label>Payment Mode</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
              <option>UPI</option>
              <option>Card</option>
              <option>NetBanking</option>
              <option>Wallet</option>
            </select>
          </div>
          <button type="submit" className="btn btn-accent" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? 'Processing...' : `Pay ₹${amount || '0'} Securely`}
          </button>
        </form>
      </div>
    </div>
  );
}
