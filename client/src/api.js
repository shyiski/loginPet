const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    signal: options.signal || AbortSignal.timeout(5000),
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || data.message || `Request failed (${response.status})`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Health & DB status
  getHealth: () => request('/health'),

  // Authentication
  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  login: (payload) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  verify2FA: (payload) =>
    request('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getMe: () => request('/auth/me'),
  getAllUsers: () => request('/auth/users'),

  loginGoogle: (payload) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateProfile: (payload) =>
    request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  logout: () =>
    request('/auth/logout', {
      method: 'POST'
    }),

  // 2FA Management
  setup2FA: () =>
    request('/auth/2fa/setup', {
      method: 'POST'
    }),

  confirm2FA: (code) =>
    request('/auth/2fa/confirm', {
      method: 'POST',
      body: JSON.stringify({ code })
    }),

  disable2FA: (password) =>
    request('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ password })
    }),

  // Audit Logs & Stats
  getAuditLogs: (limit = 40) => request(`/audit/logs?limit=${limit}`),
  getStats: () => request('/audit/stats')
};
