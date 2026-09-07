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

export function api(path) {
  if (!path.startsWith('/')) path = '/' + path;
  return API_BASE + path;
}

export default api;
