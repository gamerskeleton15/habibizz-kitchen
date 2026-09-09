// Single source of truth for the backend base URL.
//
// In development, the Vite dev server proxies /api and /auth to the local
// Express server on port 4000 (see vite.config.js), so we leave the base
// empty and use relative URLs.
//
// In production, set VITE_API_BASE at *build time* (e.g. on Vercel project
// settings -> Environment Variables) to the Vercel backend URL, e.g.
//   VITE_API_BASE=https://habibizz-api.vercel.app
// Vite bakes it into the bundle.
//
// Components should call `api('/api/menu')` or `api('/auth/me')` instead
// of hardcoding the path, so the same code works in dev and prod.

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

// Build the full URL for a backend path. Use this when you need the URL
// itself rather than a fetch (e.g. the OAuth redirect in AuthProvider).
function apiUrl(path) {
  if (!path.startsWith('/')) path = '/' + path;
  return API_BASE + path;
}

// Fetch a backend path with credentials included automatically.
//
// credentials: 'include' is the key fix for cross-origin sessions: it tells
// the browser to attach the session cookie on requests to the API domain,
// so a user who just signed in via OAuth stays logged in across the
// frontend <-> backend boundary. Without it the cookie is dropped and the
// backend sees no session. Headers, method, and body can still be passed as
// options and are merged over sensible defaults.
function api(path, options = {}) {
  const { headers = {}, ...rest } = options;
  const fetchOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...rest,
  };

  // Drop the empty Content-Type header we'd otherwise send on GETs that
  // pass no headers, so it isn't needlessly attached.
  if (Object.keys(fetchOptions.headers).length === 0) {
    delete fetchOptions.headers;
  }

  return fetch(apiUrl(path), fetchOptions);
}

export { apiUrl };

export default api;
