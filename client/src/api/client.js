const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readCookie(name) {
  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie.split('; ').find((item) => item.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

export class ApiError extends Error {
  constructor(message, { status, code, errors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

export async function apiRequest(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (!SAFE_METHODS.has(method)) {
    const csrfToken = readCookie('clear_csrf');
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  let response;
  try {
    response = await fetch(path, {
      ...options,
      method,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection and try again.', {
      status: 0,
      code: 'NETWORK_ERROR',
    });
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(payload?.message || 'The request could not be completed.', {
      status: response.status,
      code: payload?.code,
      errors: payload?.errors,
    });
  }

  return payload?.data;
}

function queryString(values) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const api = {
  login: (credentials) => apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  me: () => apiRequest('/api/auth/me'),
  demoAccounts: () => apiRequest('/api/auth/demo-accounts'),
  professors: () => apiRequest('/api/professors'),
  documents: (filters) => apiRequest(`/api/documents${queryString(filters)}`),
  document: (id) => apiRequest(`/api/documents/${id}`),
  createDocument: (input) => apiRequest('/api/documents', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  updateStatus: (id, input) => apiRequest(`/api/documents/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }),
  updateDocument: (id, input) => apiRequest(`/api/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  }),
  history: (id) => apiRequest(`/api/documents/${id}/history`),

  documentFiles: (id) => apiRequest(`/api/documents/${id}/files`),
  uploadFile: (id, { requirementSlug, file }) => {
    const form = new FormData();
    form.set('requirementSlug', requirementSlug);
    form.set('file', file);
    return apiRequest(`/api/documents/${id}/files`, { method: 'POST', body: form });
  },
  // The browser carries the session cookie on the navigation itself, so a plain
  // link is enough — downloads are GETs and therefore exempt from CSRF.
  fileHref: (fileId) => `/api/files/${fileId}`,
  deleteFile: (fileId) => apiRequest(`/api/files/${fileId}`, { method: 'DELETE' }),

  messages: () => apiRequest('/api/messages'),
  documentMessages: (id) => apiRequest(`/api/documents/${id}/messages`),
  sendMessage: (id, input) => apiRequest(`/api/documents/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify(input),
  }),
};
