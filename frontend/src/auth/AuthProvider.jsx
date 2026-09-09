// AuthProvider - global React context for the current logged-in user.
//
// On mount, it calls GET /auth/me to find out whether the session cookie
// (set during a previous OAuth login) is still valid. It exposes:
//   - user: the current user object, or null when nobody is logged in
//   - loading: true while the initial /auth/me fetch is in flight
//   - loginWith(provider): redirects the browser to the OAuth start URL
//   - logout(): POSTs /auth/logout and clears local state
//   - refresh(): re-fetches /auth/me (used after the OAuth redirect)
//
// The session cookie is httpOnly so JS can't read it - everything goes
// through /auth/me. We never put anything sensitive in localStorage.

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { apiUrl } from '../apiClient'

const AuthContext = createContext({
  user: null,
  loading: true,
  loginWith: () => {},
  logout: async () => {},
  refresh: async () => {},
})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // After a sign-in, return the user to the page they were trying to
  // reach before we sent them to /login. A guest who hit "ADD TO CART"
  // on /menu gets bounced to /login, signs in (which lands back on the
  // root /?login=success because that's where the OAuth callback points),
  // and once `user` is set we send them back to /menu automatically.
  // Only acts when a pending redirect was saved by the gating code, so
  // normal browsing is never hijacked.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!user) return
    const redirect = sessionStorage.getItem('habibizz-redirect')
    if (redirect) {
      sessionStorage.removeItem('habibizz-redirect')
      navigate(redirect)
    }
  }, [user, navigate])

  // Fetch the current user from the backend. Called on mount and after
  // an OAuth redirect so the UI updates without a full page reload.
  const refresh = useCallback(async () => {
    try {
      // The apiClient now automatically includes credentials: 'include'
      const res = await api('/auth/me')
      if (!res.ok) {
        setUser(null)
        return
      }
      const data = await res.json()
      setUser(data.user || null)
    } catch (err) {
      console.error('Failed to fetch /auth/me:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // After the OAuth redirect, the URL ends up like `/?login=success`
  // (or `failed`). Strip that query param so a refresh doesn't show
  // the param forever and so the user can share the URL cleanly.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (!params.has('login')) return
    params.delete('login')
    const cleaned = params.toString()
    const newUrl =
      window.location.pathname + (cleaned ? `?${cleaned}` : '') + window.location.hash
    window.history.replaceState({}, '', newUrl)
  }, [])

  // Redirect the browser to the backend's OAuth start URL. The backend
  // bounces the user to Google/GitHub, then back to the frontend with
  // a session cookie set. We do a full navigation (not fetch) because
  // we need the browser to follow the cross-origin redirects.
  const loginWith = useCallback((provider) => {
    window.location.href = apiUrl(`/auth/${provider}`)
  }, [])

  // Clear the session on the backend, then drop local state. The backend
  // also destroys the session cookie so the next /auth/me returns null.
  const logout = useCallback(async () => {
    try {
      await api('/auth/logout', {
        method: 'POST',
      })
    } catch (err) {
      console.error('Failed to log out:', err)
    }
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, loginWith, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
