import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

// Access token is kept in memory only (never localStorage) to limit XSS
// exposure. Sessions are restored via the httpOnly refresh cookie.
let accessToken = null;

API.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        accessToken = res.data.accessToken;
        return accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && original.url !== '/api/auth/login' && original.url !== '/auth/login' && !String(original.url).endsWith('/auth/refresh')) {
      original._retry = true;
      try {
        await refreshAccessToken();
        return API(original);
      } catch {
        accessToken = null;
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function setAuthToken(token) {
  accessToken = token;
}

export function getErrorMessage(err, fallback = 'Something went wrong') {
  const details = err?.response?.data?.details;
  if (Array.isArray(details) && details.length) {
    return details.map((d) => d.message).join('; ');
  }
  return err?.response?.data?.message || fallback;
}

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  logout: () => API.post('/auth/logout'),
  me: () => API.get('/auth/me'),
  changePassword: (data) => API.put('/auth/password', data),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (data) => API.post('/auth/reset-password', data),
  verifyEmail: (token) => API.post('/auth/verify-email', { token }),
  resendVerification: () => API.post('/auth/resend-verification'),
};

export { refreshAccessToken };

export const orgAPI = {
  list: (params) => API.get('/organizations', { params }),
  get: (id) => API.get(`/organizations/${id}`),
  mine: () => API.get('/organizations/mine'),
  create: (data) => API.post('/organizations', data),
  update: (data) => API.put('/organizations/mine', data),
};

export const categoryAPI = {
  list: () => API.get('/categories'),
};

export const paymentAPI = {
  createOrder: (data) => API.post('/payments/orders', data),
  verify: (data) => API.post('/payments/verify', data),
  mine: (params) => API.get('/payments/mine', { params }),
  org: (params) => API.get('/payments/org', { params }),
};

export const billAPI = {
  upload: (data) => API.post('/bills', data),
  mine: (params) => API.get('/bills/mine', { params }),
  summary: () => API.get('/bills/summary'),
  get: (id) => API.get(`/bills/${id}`),
  remove: (id) => API.delete(`/bills/${id}`),
  orgList: (params) => API.get('/bills/org/list', { params }),
  review: (id, data) => API.put(`/bills/${id}/review`, data),
  exportCsv: (params) => API.get('/bills/export/csv', { params, responseType: 'blob' }),
};

export const reportAPI = {
  export: (params) => API.get('/reports/export', { params, responseType: 'blob' }),
  share: (data) => API.post('/reports/share', data),
  shared: (token) => API.get(`/reports/shared/${token}`),
};

export const adminAPI = {
  overview: () => API.get('/admin/overview'),
  organizations: (params) => API.get('/admin/organizations', { params }),
  verifyOrganization: (id, verified) => API.patch(`/admin/organizations/${id}/verify`, { verified }),
  users: (params) => API.get('/admin/users', { params }),
  toggleUser: (id, isActive) => API.patch(`/admin/users/${id}/status`, { isActive }),
  categories: () => API.get('/admin/categories'),
  createCategory: (data) => API.post('/admin/categories', data),
  auditLogs: (params) => API.get('/admin/audit-logs', { params }),
};

export function fileUrl(key) {
  if (!key) return '';
  if (key.startsWith('http')) return key;
  return `/api/files/${encodeURIComponent(key)}`;
}

export function fileDownloadUrl(key) {
  const url = fileUrl(key);
  return url ? `${url}?disposition=attachment` : '';
}

export default API;
