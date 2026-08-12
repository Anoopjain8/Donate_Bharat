import { describe, it, expect } from 'vitest';
import { getErrorMessage, fileUrl } from './api';

describe('getErrorMessage', () => {
  it('returns the server message', () => {
    const err = { response: { data: { message: 'Invalid credentials' } } };
    expect(getErrorMessage(err)).toBe('Invalid credentials');
  });

  it('joins validation detail messages', () => {
    const err = {
      response: {
        data: {
          details: [{ message: 'Name is required' }, { message: 'Email is invalid' }],
        },
      },
    };
    expect(getErrorMessage(err)).toBe('Name is required; Email is invalid');
  });

  it('falls back when no response payload exists', () => {
    expect(getErrorMessage(new Error('network'))).toBe('Something went wrong');
    expect(getErrorMessage(new Error('x'), 'Custom fallback')).toBe('Custom fallback');
  });
});

describe('fileUrl', () => {
  it('returns empty for empty keys', () => {
    expect(fileUrl('')).toBe('');
    expect(fileUrl(null)).toBe('');
  });

  it('passes through absolute URLs', () => {
    expect(fileUrl('https://example.com/a.pdf')).toBe('https://example.com/a.pdf');
  });

  it('builds an encoded proxy URL for stored keys', () => {
    expect(fileUrl('bills/file a.pdf')).toBe('/api/files/bills%2Ffile%20a.pdf');
  });
});
