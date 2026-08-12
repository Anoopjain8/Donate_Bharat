import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import IndiaLogo from './IndiaLogo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const links = [];
  if (user) {
    if (user.role === 'payer') {
      links.push({ to: '/dashboard', label: 'Dashboard' });
      links.push({ to: '/upload', label: 'Upload Bill' });
      links.push({ to: '/receipts', label: 'My Bills' });
      links.push({ to: '/reports', label: 'Reports' });
      links.push({ to: '/organizations', label: 'Browse Payees' });
    } else if (user.role === 'payee') {
      links.push({ to: '/payee/dashboard', label: 'Dashboard' });
      links.push({ to: '/payee/bills', label: 'Incoming Bills' });
      links.push({ to: '/payee/profile', label: 'Profile' });
      links.push({ to: '/reports', label: 'Reports' });
    } else if (user.role === 'admin') {
      links.push({ to: '/admin', label: 'Overview' });
      links.push({ to: '/admin/organizations', label: 'Organizations' });
      links.push({ to: '/admin/users', label: 'Users' });
      links.push({ to: '/admin/audit', label: 'Audit Log' });
    }
  }

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <Link to="/" className="nav-brand">
          <span className="nav-logo"><IndiaLogo /></span> Donate Bharat
        </Link>
        <div className="nav-links">
          {!user && (
            <>
              <Link to="/organizations">Browse Payees</Link>
              <Link to="/transparency">Transparency</Link>
            </>
          )}
          {links.map((l) => (
            <Link key={l.to} to={l.to}>{l.label}</Link>
          ))}
        </div>
        <div className="nav-auth">
          {user ? (
            <>
              <span className="nav-user">
                {user.name} <small>({user.role})</small>
              </span>
              <button className="btn-sm btn-sm-primary" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-sm btn-sm-primary">Login</Link>
              <Link to="/register" className="btn-sm btn-sm-primary">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
