// AdminSupportPage - the shopkeeper's /admin/support view.
// Left column: list of support threads, sorted newest activity first.
// Right column: the selected thread's full conversation + reply box.
// Polls /api/support/threads every 5s. Requires admin auth.

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import AdminLogin from './AdminLogin'
import api from '../apiClient'

const TOKEN_KEY = 'habibizz-admin-token'
const POLL_INTERVAL_MS = 5000

const formatTime = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function AdminSupportPage() {
  // Token is read from localStorage on mount, same pattern as AdminDashboard.
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null
    } catch {
      return null
    }
  })

  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [selectedThread, setSelectedThread] = useState(null)
  const [loadingThread, setLoadingThread] = useState(false)

  // Poll the threads list every 5s. We use a ref to track the latest token
  // inside the interval callback without re-creating the timer on every
  // token change.
  useEffect(() => {
    if (!token) return
    let cancelled = false

    const fetchThreads = async () => {
      try {
        const res = await fetch(api('/api/support/threads'), {
          headers: { 'x-admin-token': token },
        })
        if (res.status === 401) {
          handleLogout()
          return
        }
        if (!res.ok) throw new Error('Failed to load threads')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // When the user picks a thread, fetch its full details. Poll that too so
  // we see new customer messages as they arrive.
  useEffect(() => {
    if (!token || !selectedId) return
    let cancelled = false
    setLoadingThread(true)

    const fetchOne = async () => {
      try {
        const res = await fetch(api(`/api/support/threads/${selectedId}`), {
          headers: { 'x-admin-token': token },
        })
        if (res.status === 401) {
          handleLogout()
          return
        }
        if (!res.ok) throw new Error('Failed to load thread')
        const data = await res.json()
        if (cancelled) return
        setSelectedThread(data.thread)
        setLoadingThread(false)
        // Mark as read on the server so the unread badge clears.
        fetch(api(`/api/support/threads/${selectedId}/read`), {
          method: 'POST',
          headers: { 'x-admin-token': token },
        }).catch(() => {})
        // Also clear the local unread indicator immediately.
        setThreads((prev) =>
          prev.map((t) => (t.id === selectedId ? { ...t, unreadByAdmin: false } : t))
        )
      } catch (e) {
        if (cancelled) return
        setError(e.message)
        setLoadingThread(false)
      }
    }

    fetchOne()
    const interval = setInterval(fetchOne, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks-exhaustive-deps
  }, [token, selectedId])

  // Logout: mirrors the AdminDashboard flow.
  const handleLogout = async () => {
    try {
      if (token) {
        await fetch(api('/api/admin/logout'), {
          method: 'POST',
          headers: { 'x-admin-token': token },
        })
      }
    } catch {
      // ignore
    }
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // ignore
    }
    setToken(null)
  }

  // Send an admin reply. On success, replace the selected thread with the
  // server's response (which includes the new message) and also patch the
  // local thread list so the preview updates.
  const handleReply = async (text) => {
    if (!token || !selectedId) return
    try {
      const res = await fetch(api(`/api/support/threads/${selectedId}/reply`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to send reply')
      }
      const data = await res.json()
      setSelectedThread(data.thread)
      // Refresh the list entry so the snippet + timestamp reflect the reply.
      setThreads((prev) =>
        prev
          .map((t) => (t.id === data.thread.id ? { ...t, ...data.thread } : t))
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      )
    } catch (e) {
      alert('Could not send reply: ' + e.message)
    }
  }

  // Close / reopen a thread.
  const handleStatus = async (newStatus) => {
    if (!token || !selectedId) return
    try {
      const res = await fetch(api(`/api/support/threads/${selectedId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to update status')
      }
      const data = await res.json()
      setSelectedThread(data.thread)
      setThreads((prev) =>
        prev.map((t) => (t.id === data.thread.id ? { ...t, ...data.thread } : t))
      )
    } catch (e) {
      alert('Could not update status: ' + e.message)
    }
  }

  // Auth gate - same as AdminDashboard.
  if (!token) {
    return <AdminLogin onLogin={(t) => setToken(t)} />
  }

  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-black">
      {/* Header */}
      <header className="bg-brand-black text-brand-white py-4 px-6 border-b-4 border-brand-yellow">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl">
              <span className="text-brand-yellow">SUPPORT</span> INBOX
            </h1>
            <p className="text-sm text-brand-white/60 mt-1 font-body">
              Customer messages - auto-refreshes every 5 seconds
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="text-brand-yellow hover:text-brand-white text-sm font-bold underline"
            >
              ← Back to Orders
            </Link>
            <button
              onClick={handleLogout}
              className="bg-brand-yellow text-brand-black text-xs font-display uppercase tracking-wider px-4 py-2 rounded-full shadow-lg shadow-brand-yellow/30 hover:shadow-xl hover:shadow-brand-yellow/40 hover:bg-brand-yellow-warm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
            >
              LOG OUT
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-4 font-body text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Thread list (left) */}
          <aside className="lg:col-span-1">
            <h2 className="font-display text-lg mb-3 text-brand-black">
              THREADS
              <span className="ml-2 bg-brand-black text-brand-yellow text-xs font-bold rounded-full w-6 h-6 inline-flex items-center justify-center align-middle">
                {threads.filter((t) => t.unreadByAdmin).length}
              </span>
            </h2>
            {loading && <p className="text-gray-500 text-sm">Loading threads...</p>}
            {!loading && threads.length === 0 && (
              <div className="bg-white border-2 border-gray-200 p-6 text-center">
                <p className="text-gray-500 font-body text-sm">No support threads yet.</p>
              </div>
            )}
            <ul className="space-y-2">
              {threads.map((t) => (
                <ThreadListItem
                  key={t.id}
                  thread={t}
                  selected={selectedId === t.id}
                  onClick={() => setSelectedId(t.id)}
                />
              ))}
            </ul>
          </aside>

          {/* Conversation (right) */}
          <section className="lg:col-span-2">
            {!selectedId && (
              <div className="bg-white border-2 border-gray-200 p-12 text-center">
                <div className="text-5xl mb-3" aria-hidden="true">📨</div>
                <p className="text-gray-500 font-body">
                  Select a thread on the left to read and reply.
                </p>
              </div>
            )}

            {selectedId && (
              <Conversation
                thread={selectedThread}
                loading={loadingThread}
                onReply={handleReply}
                onStatus={handleStatus}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// One entry in the thread list. Shows a snippet of the last message, the
// thread's open/closed status, an unread indicator, and a "NEEDS YOU" pill
// when the AI has flagged this thread for a human.
function ThreadListItem({ thread, selected, onClick }) {
  const last = thread.messages?.[thread.messages.length - 1]
  const preview = last ? (last.text.length > 60 ? last.text.slice(0, 60) + '…' : last.text) : '(no messages)'
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full text-left bg-white border-2 p-3 transition-colors ${
          selected ? 'border-brand-yellow' : 'border-gray-200 hover:border-brand-yellow/50'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-display text-sm">
            {thread.id.slice(0, 8)}…
          </span>
          <div className="flex items-center gap-2">
            {thread.unreadByAdmin && (
              <span className="w-2 h-2 rounded-full bg-brand-yellow" aria-label="Unread" />
            )}
            {/* Red pill when AI escalated and a human hasn't replied yet.
                Distinct from OPEN/CLOSED so the shopkeeper notices it. */}
            {thread.needsAttention && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 bg-red-500 text-white"
                aria-label="AI flagged - needs human"
              >
                NEEDS YOU
              </span>
            )}
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 ${
                thread.status === 'open'
                  ? 'bg-brand-yellow text-brand-black'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {thread.status === 'open' ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-700 font-body line-clamp-2">{preview}</p>
        <p className="text-[10px] text-gray-500 mt-1 font-body">
          {formatTime(thread.updatedAt)}
        </p>
      </button>
    </li>
  )
}

// Right-hand pane: the full conversation + reply box.
function Conversation({ thread, loading, onReply, onStatus }) {
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listEndRef = useRef(null)

  // Auto-scroll to the newest message on every change.
  useEffect(() => {
    if (listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [thread?.messages?.length])

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    try {
      await onReply(text)
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white border-2 border-gray-200 p-6 text-center text-gray-500 font-body text-sm">
        Loading conversation...
      </div>
    )
  }
  if (!thread) {
    return (
      <div className="bg-white border-2 border-gray-200 p-6 text-center text-gray-500 font-body text-sm">
        Thread not found.
      </div>
    )
  }

  const isClosed = thread.status === 'closed'
  // Surface the AI's escalation reason if it set one. Helps the shopkeeper
  // know what the customer is upset about before they reply.
  const escalationReason = thread.escalationReason || null
  const reasonLabel = {
    human_request: 'Customer asked to talk to a person.',
    keyword: 'Customer message matched a complaint keyword.',
    ai_self_flag: 'AI self-flagged this as needing a human.',
    ai_offline: 'AI is unavailable — please respond manually.',
  }[escalationReason]

  return (
    <div className="bg-white border-2 border-gray-200 flex flex-col" style={{ minHeight: '500px' }}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-sm">
            Thread {thread.id.slice(0, 8)}…
          </h2>
          <p className="text-xs text-gray-500 font-body">
            Started {formatTime(thread.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isClosed ? (
            <button
              onClick={() => onStatus('open')}
              className="text-xs bg-brand-yellow text-brand-black font-display uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg shadow-brand-yellow/30 hover:shadow-xl hover:shadow-brand-yellow/40 hover:bg-brand-yellow-warm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
            >
              REOPEN
            </button>
          ) : (
            <button
              onClick={() => onStatus('closed')}
              className="text-xs bg-white/10 text-brand-white font-display uppercase tracking-wider px-3 py-1.5 rounded-full backdrop-blur border border-white/15 hover:bg-white/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
            >
              CLOSE
            </button>
          )}
        </div>
      </div>

      {/* AI-escalation banner. Shown only while the thread is flagged for
          a human. Disappears once the admin replies (aiHandled becomes true
          and needsAttention becomes false). */}
      {thread.needsAttention && (
        <div className="bg-red-50 border-b border-red-300 px-5 py-2 text-sm text-red-800 font-body flex items-center gap-2">
          <span aria-hidden="true">⚠️</span>
          <span>
            <strong>AI flagged this conversation.</strong>{' '}
            {reasonLabel || 'A real person should reply.'}
          </span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ maxHeight: '55vh' }}>
        {thread.messages.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-6">No messages yet.</p>
        )}
        {thread.messages.map((m) => (
          <AdminMessageBubble key={m.id} message={m} />
        ))}
        <div ref={listEndRef} />
      </div>

      {/* Reply box - hidden when the thread is closed */}
      {isClosed ? (
        <div className="border-t border-gray-200 p-4 bg-gray-50 text-center text-sm text-gray-500 font-body">
          This thread is closed. Reopen it to reply.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="border-t border-gray-200 p-4 flex items-end gap-2"
        >
          <label className="flex-1">
            <span className="sr-only">Reply</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              rows={2}
              maxLength={5000}
              placeholder="Type your reply..."
              className="w-full px-3 py-2 border-2 border-gray-300 focus:border-brand-yellow focus:outline-none font-body resize-none text-brand-black"
            />
          </label>
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="bg-brand-yellow text-brand-black font-display uppercase tracking-wider px-5 py-2 rounded-full shadow-lg shadow-brand-yellow/30 hover:shadow-xl hover:shadow-brand-yellow/40 hover:bg-brand-yellow-warm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? '…' : 'SEND'}
          </button>
        </form>
      )}
    </div>
  )
}

// One message bubble in the admin view. Customer messages are yellow on the
// left; admin messages are dark on the right; AI (auto-reply) messages are
// white with a yellow left border so the shopkeeper can see exactly what
// the assistant said before taking over.
function AdminMessageBubble({ message }) {
  const isAdmin = message.from === 'admin'
  const isAI = message.from === 'ai'
  // Alignment: admin = right (their own replies), everyone else = left.
  const alignment = isAdmin ? 'justify-end' : 'justify-start'
  let bubbleClass
  if (isAdmin) {
    bubbleClass = 'bg-brand-black text-brand-white'
  } else if (isAI) {
    bubbleClass = 'bg-white text-brand-black border-2 border-brand-yellow'
  } else {
    bubbleClass = 'bg-brand-yellow text-brand-black'
  }
  const label = isAdmin ? 'You (admin)' : isAI ? 'AI (auto-reply)' : 'Customer'
  return (
    <div className={`flex ${alignment}`}>
      <div className={`max-w-[80%] px-4 py-2 ${bubbleClass}`}>
        <p className="text-xs font-bold uppercase mb-1 opacity-70">{label}</p>
        <p className="whitespace-pre-wrap break-words font-body">{message.text}</p>
        <p className="text-[10px] mt-1 opacity-60">{formatTime(message.timestamp)}</p>
      </div>
    </div>
  )
}
