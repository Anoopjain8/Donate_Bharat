import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import IndiaLogo from '../IndiaLogo';

const NAV = {
  payer: [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/upload', label: 'Upload Bill', icon: '📄' },
    { to: '/receipts', label: 'My Bills', icon: '🗂️' },
    { to: '/reports', label: 'Reports', icon: '📈' },
    { to: '/organizations', label: 'Browse Payees', icon: '🏛️' },
  ],
  payee: [
    { to: '/payee/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/payee/bills', label: 'Incoming Bills', icon: '🗂️' },
    { to: '/payee/profile', label: 'Profile', icon: '👤' },
    { to: '/reports', label: 'Reports', icon: '📈' },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: '📊' },
    { to: '/admin/organizations', label: 'Organizations', icon: '🏛️' },
    { to: '/admin/users', label: 'Users', icon: '👥' },
    { to: '/admin/audit', label: 'Audit Log', icon: '📜' },
  ],
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const links = user ? NAV[user.role] || [] : [];
  const activeLink = links.find((l) => l.to === location.pathname);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar${drawerOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="app-brand" onClick={closeDrawer}>
            <span className="app-brand-logo"><IndiaLogo /></span>
            <span>Donate Bharat</span>
          </Link>
          <button className="drawer-close" onClick={closeDrawer} aria-label="Close menu">✕</button>
        </div>

        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={closeDrawer}
            >
              <span className="nav-icon">{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{(user?.name || '?').charAt(0)}</div>
            <div className="sidebar-user-text">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button className="btn-sm btn-sm-outline logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {drawerOpen && <div className="drawer-backdrop" onClick={closeDrawer} />}

      <div className="app-main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setDrawerOpen(true)} aria-label="Open menu">☰</button>
          <div className="topbar-title">{activeLink?.label || 'Donate Bharat'}</div>
          <div className="topbar-actions">
            <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle dark mode">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <span className="topbar-user">{user?.name}</span>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
