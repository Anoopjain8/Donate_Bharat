import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VerifyEmail from './VerifyEmail';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSearchParams: vi.fn(),
  };
});

vi.mock('../services/api', () => ({
  authAPI: { verifyEmail: vi.fn() },
}));

import { useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';

const mockParams = (token) => ({ get: (key) => (key === 'token' ? token : null) });

beforeEach(() => {
  useSearchParams.mockReset();
  authAPI.verifyEmail.mockReset();
});

describe('VerifyEmail', () => {
  it('verifies a valid token and shows success', async () => {
    useSearchParams.mockReturnValue([mockParams('abc123')]);
    authAPI.verifyEmail.mockResolvedValue({ data: {} });

    render(
      <MemoryRouter>
        <VerifyEmail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/email has been verified/i)).toBeInTheDocument();
    });
    expect(authAPI.verifyEmail).toHaveBeenCalledWith('abc123');
  });

  it('shows an invalid state when the API rejects the token', async () => {
    useSearchParams.mockReturnValue([mockParams('bad')]);
    authAPI.verifyEmail.mockRejectedValue({ response: { data: { message: 'expired' } } });

    render(
      <MemoryRouter>
        <VerifyEmail />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
    });
  });

  it('shows an invalid state when no token is provided', () => {
    useSearchParams.mockReturnValue([mockParams(null)]);

    render(
      <MemoryRouter>
        <VerifyEmail />
      </MemoryRouter>
    );

    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(authAPI.verifyEmail).not.toHaveBeenCalled();
  });
});
