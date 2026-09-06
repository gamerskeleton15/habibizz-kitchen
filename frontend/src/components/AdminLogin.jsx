// AdminLogin - password gate for the shopkeeper dashboard.
// - Single password field (no usernames for this small project)
// - Calls POST /api/admin/login
// - On success, stashes the returned token in localStorage and calls onLogin(token)
// - On failure, shows the error message from the server

import { useState } from 'react'
import { Lock } from 'lucide-react'
import SmokeyBackground from './SmokeyBackground'

export default function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }
      // Save the token so refreshing the page keeps us logged in
      try {
        localStorage.setItem('habibizz-admin-token', data.token)
      } catch {
        // localStorage might be unavailable (private mode); non-fatal
      }
      onLogin(data.token)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4 relative">
      {/* Live smoke background - same drifting brand-yellow plumes as the
          customer login, so the two sign-in screens feel like one site. */}
      <SmokeyBackground color="#FFD400" intensity={0.35} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        {/* Brand mark */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl sm:text-5xl text-brand-white">
            <span className="text-brand-yellow">HABI</span>BIZZ
            <span className="text-brand-yellow">.</span>
          </h1>
          <p className="text-brand-white/60 mt-2 font-body text-sm tracking-widest">
            ADMIN ACCESS
          </p>
        </div>

        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="bg-brand-white p-8 border-4 border-brand-yellow"
        >
          <h2 className="font-display text-2xl mb-1 text-brand-black">
            Shopkeeper Login
          </h2>
          <p className="text-sm text-gray-600 mb-6 font-body">
            Enter the admin password to view the order board.
          </p>

          <label className="block mb-4">
            <span className="block text-xs font-bold text-brand-black mb-2 tracking-wider uppercase flex items-center gap-1.5">
              <Lock size={14} strokeWidth={2.5} aria-hidden="true" />
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              className="w-full px-4 py-3 border-2 border-gray-300 focus:border-brand-yellow focus:outline-none font-body text-brand-black"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 text-sm p-3 mb-4 font-body">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-yellow text-brand-black font-display uppercase tracking-wider py-3 rounded-full shadow-lg shadow-brand-yellow/30 hover:shadow-xl hover:shadow-brand-yellow/40 hover:bg-brand-yellow-warm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'CHECKING…' : 'LOG IN'}
          </button>
        </form>

        <p className="text-center text-brand-white/40 text-xs mt-6 font-body">
          Default password is set in <code>backend/data/config.json</code>
        </p>
      </div>
    </div>
  )
}
