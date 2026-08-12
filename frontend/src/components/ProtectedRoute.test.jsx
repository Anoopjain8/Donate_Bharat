import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../context/AuthContext';

const renderRoute = (children) =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route
          path="/dashboard"
          element={<ProtectedRoute roles={['payer']}>{children}</ProtectedRoute>}
        />
        <Route path="/login" element={<div>login page</div>} />
        <Route path="/" element={<div>home page</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  useAuth.mockReset();
});

describe('ProtectedRoute', () => {
  it('shows a loading state while restoring the session', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderRoute(<div>Dashboard</div>);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('redirects to /login when unauthenticated', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderRoute(<div>Dashboard</div>);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('redirects to / when the role is not allowed', () => {
    useAuth.mockReturnValue({ user: { role: 'admin' }, loading: false });
    renderRoute(<div>Dashboard</div>);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.getByText('home page')).toBeInTheDocument();
  });

  it('renders children for an authorized role', () => {
    useAuth.mockReturnValue({ user: { role: 'payer' }, loading: false });
    renderRoute(<div>Dashboard content</div>);
    expect(screen.getByText('Dashboard content')).toBeInTheDocument();
  });
});
