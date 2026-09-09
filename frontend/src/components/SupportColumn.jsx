// SupportColumn - small summary card shown in AdminDashboard next to the
// order columns. Polls /api/support/threads on its own timer so the unread
// badge stays fresh without coupling to the orders poll.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../apiClient'

const TOKEN_KEY = 'habibizz-admin-token'
const POLL_INTERVAL_MS = 5000

export default function SupportColumn() {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const token = (() => {
      try {
        return localStorage.getItem(TOKEN_KEY)
      } catch {
        return null
      }
    })()
    if (!token) return

    const fetchThreads = async () => {
      try {
        const res = await api('/api/support/threads', {
          headers: { 'x-admin-token': token },
        })
        if (!res.ok) throw new Error('Failed to load support threads')
        const data = await res.json()
        if (cancelled) return
        setThreads(data.threads || [])
        setError(null)
        setLoading(false)
      } catch (e) {
        if (cancelled) return
        setError(e.message)
        setLoading(false)
      }
    }

    fetchThreads()
    const interval = setInterval(fetchThreads, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const openCount = threads.filter((t) => t.status === 'open').length
  const unreadCount = threads.filter((t) => t.unreadByAdmin).length
  // Threads the AI has flagged for human attention and no one has
  // replied to yet. Distinct from the regular unread badge so a real
  // complaint stands out from routine new messages.
  const needsAttentionCount = threads.filter((t) => t.needsAttention).length

  return (
    <div className="bg-white border-2 border-gray-200 flex flex-col">
      {/* Column header - matches the order column look */}
      <div className="bg-brand-black text-brand-yellow px-4 py-3 flex items-center justify-between">
        <h2 className="font-display text-lg">Support</h2>
        <span className="bg-brand-yellow text-brand-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {unreadCount}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3 min-h-[200px] flex-1 flex flex-col">
        {loading ? (
          <p className="text-gray-400 text-sm text-center py-6">Loading...</p>
        ) : error ? (
          <p className="text-red-500 text-sm text-center py-6">{error}</p>
        ) : (
          <>
            <div className="text-center py-2">
              <p className="font-display text-3xl text-brand-black">{openCount}</p>
              <p className="text-xs text-gray-500 font-body uppercase tracking-wide">
                open thread{openCount === 1 ? '' : 's'}
              </p>
            </div>

            {/* Escalated threads — AI has flagged them for a human.
                Sits ABOVE the regular new-messages banner so it's the
                first thing the shopkeeper sees. */}
            {needsAttentionCount > 0 && (
              <div className="bg-red-500 text-white text-xs font-bold text-center px-2 py-1">
                {needsAttentionCount} need you
              </div>
            )}

            {unreadCount > 0 && (
              <div className="bg-brand-yellow text-brand-black text-xs font-bold text-center px-2 py-1">
                {unreadCount} new message{unreadCount === 1 ? '' : 's'}
              </div>
            )}

            <p className="text-xs text-gray-500 font-body text-center flex-1">
              Customer chat conversations. Click below to read and reply.
            </p>

            <Link
              to="/admin/support"
              className="block text-center bg-brand-yellow text-brand-black text-sm font-bold px-3 py-2 hover:bg-brand-yellow-warm"
            >
              View support →
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
