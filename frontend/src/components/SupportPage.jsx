// SupportPage - the customer-facing /support page.
// Customers can send messages to the shopkeeper here. Each browser gets one
// thread, identified by a UUID stored in localStorage so the conversation
// survives refreshes. Polls the backend every 5s to receive admin replies.

import { useState, useEffect, useRef } from 'react'
import api from '../apiClient'

const STORAGE_KEY = 'habibizz-support-thread'
const POLL_INTERVAL_MS = 5000

// Generate a thread ID using the browser's crypto API. Falls back to a
// timestamp+random if crypto.randomUUID isn't available (older browsers).
const generateThreadId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const formatTime = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function SupportPage() {
  // Thread ID - either read from localStorage or generated on first visit.
  // Stored as state so re-renders don't lose it; persisted to localStorage
  // on every change.
  const [threadId, setThreadId] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null
    } catch {
      return null
    }
  })

  const [thread, setThread] = useState(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [closedBanner, setClosedBanner] = useState(false)
  // We only fetch from the server once we have a threadId.
  const [loading, setLoading] = useState(true)

  // Track thread id changes (or first mount) - persist to localStorage.
  useEffect(() => {
    if (threadId) {
      try {
        localStorage.setItem(STORAGE_KEY, threadId)
      } catch {
        // ignore
      }
    }
  }, [threadId])

  // If we don't have a thread ID yet, generate one. We don't create the
  // thread on the server until the customer sends their first message -
  // this keeps the support.json file free of empty threads.
  useEffect(() => {
    if (!threadId) {
      setThreadId(generateThreadId())
      setLoading(false)
    }
  }, [threadId])

  // Poll the server for the current thread. If the thread 404s (e.g. it was
  // cleared server-side or this is a fresh thread that has no messages yet),
  // we just leave the local state empty - nothing to render.
  useEffect(() => {
    if (!threadId) return
    let cancelled = false

    const tick = async () => {
      try {
        const res = await fetch(api(`/api/support/threads/${threadId}`))
        if (cancelled) return
        if (res.status === 404) {
          // Thread doesn't exist yet (no message sent, or it was cleared).
          setThread(null)
          setLoading(false)
          return
        }
        if (!res.ok) throw new Error('Failed to load thread')
        const data = await res.json()
        if (cancelled) return
        setThread(data.thread)
        setLoading(false)
        // Surface a "closed" banner if the admin just closed the thread.
        if (data.thread.status === 'closed') {
          setClosedBanner(true)
        }
      } catch (e) {
        if (cancelled) return
        setError(e.message)
        setLoading(false)
      }
    }

    tick()
    const interval = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [threadId])

  // Scroll the message list to the bottom whenever a new message arrives.
  const listEndRef = useRef(null)
  useEffect(() => {
    if (listEndRef.current) {
      listEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [thread?.messages?.length])

  // Send a new message. On the first message ever, this also creates the
  // thread on the server.
  const handleSend = async (e) => {
    e?.preventDefault?.()
    const text = draft.trim()
    if (!text || sending) return

    setSending(true)
    setError(null)
    try {
      let res
      if (!thread || thread.messages.length === 0) {
        // First message ever - create the thread. Send our pre-generated
        // threadId so the server stores the conversation under the ID we
        // already saved in localStorage. Otherwise the next poll would
        // 404 on a different ID and wipe the message we just sent.
        res = await fetch(api('/api/support/threads'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, id: threadId }),
        })
      } else {
        // Subsequent message - append to the existing thread.
        res = await fetch(api(`/api/support/threads/${threadId}/messages`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to send message')
      }
      const data = await res.json()
      // Keep the React threadId state in sync with the thread the server
      // actually saved. (If a future server change normalizes the id,
      // polling will keep working.)
      if (data.thread?.id && data.thread.id !== threadId) {
        setThreadId(data.thread.id)
      }
      setThread(data.thread)
      setDraft('')
      setClosedBanner(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  // Start a fresh thread (clear localStorage + state). Used if the customer
  // wants to start a new conversation.
  const handleNewThread = () => {
    if (!window.confirm('Start a new conversation? Your current thread will remain saved on the server.')) {
      return
    }
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setThreadId(generateThreadId())
    setThread(null)
    setDraft('')
    setClosedBanner(false)
  }

  const messages = thread?.messages || []
  const hasMessages = messages.length > 0
  const isClosed = thread?.status === 'closed'

  return (
    <div className="bg-transparent text-brand-white min-h-[calc(100vh-200px)] flex flex-col">
      {/* Banner - dark with a yellow radial behind the H1 */}
      <section className="bg-black/60 backdrop-blur-xl text-brand-white py-12 sm:py-16 border-b border-white/10 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(255, 212, 0, 0.12), transparent 70%)',
          }}
        />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="font-display text-4xl sm:text-5xl mb-3">
            NEED <span className="text-brand-yellow">HELP?</span>
          </h1>
          <p className="text-white/80 font-body">
            Send us a message and the shopkeeper will get back to you. We're usually quick.
          </p>
        </div>
      </section>

      {/* Chat card */}
      <section className="flex-1 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="glass-strong text-brand-white flex flex-col rounded-3xl overflow-hidden"
            style={{ minHeight: '500px' }}
          >
            {/* Thread meta header */}
            <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-display text-sm text-brand-white">SUPPORT CHAT</h2>
                <p className="text-xs text-white/50 font-body">
                  {hasMessages
                    ? `Thread ${threadId.slice(0, 8)}...`
                    : 'No messages yet - say hi!'}
                </p>
              </div>
              {hasMessages && (
                <button
                  onClick={handleNewThread}
                  className="text-xs text-white/50 hover:text-red-400 underline font-body"
                >
                  Start new conversation
                </button>
              )}
            </div>

            {/* Closed banner - glass warning yellow */}
            {isClosed && closedBanner && (
              <div className="glass-yellow text-brand-black px-5 py-2 text-sm font-body flex items-center justify-between">
                <span>This conversation was closed. Send a new message to reopen it.</span>
                <button
                  onClick={() => setClosedBanner(false)}
                  className="text-xs text-brand-black/70 hover:text-brand-black"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Message list */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3" style={{ maxHeight: '60vh' }}>
              {loading && (
                <p className="text-center text-white/50 text-sm py-6">Loading...</p>
              )}

              {!loading && !hasMessages && (
                <div className="text-center py-12">
                  <div className="text-5xl mb-3" aria-hidden="true">💬</div>
                  <p className="text-white/60 font-body">
                    Send us a message and we'll get back to you.
                  </p>
                </div>
              )}

              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}

              <div ref={listEndRef} />
            </div>

            {/* Error display */}
            {error && (
              <div className="px-5 py-2 bg-red-500/10 border-t border-red-500/30 text-sm text-red-300 font-body">
                {error}
              </div>
            )}

            {/* Send box - glass surface, transparent textarea so the
                background shows through */}
            <form
              onSubmit={handleSend}
              className="border-t border-white/10 p-4 flex items-end gap-2 bg-white/5 backdrop-blur"
            >
              <label className="flex-1">
                <span className="sr-only">Message</span>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter sends, Shift+Enter inserts a newline.
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  rows={2}
                  maxLength={5000}
                  placeholder="Type your message..."
                  className="w-full bg-transparent px-3 py-2 border border-white/10 focus:border-brand-yellow focus:outline-none font-body resize-none text-brand-white placeholder-white/30 rounded-lg"
                />
              </label>
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="bg-brand-yellow text-brand-black font-bold px-5 py-2 hover:bg-brand-yellow-warm transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-display rounded-full shadow-lg shadow-brand-yellow/20"
                aria-label="Send message"
              >
                {sending ? '…' : 'SEND'}
              </button>
            </form>
          </div>

          <p className="text-xs text-white/50 text-center mt-3 font-body">
            For urgent issues, call us at (555) 555-1234.
          </p>
        </div>
      </section>
    </div>
  )
}

// One chat bubble. Customer messages are right-aligned in brand yellow;
// admin messages are left-aligned in light glass. AI (auto-reply) messages
// get a yellow-tinted glass so the customer can tell at a glance what's
// from a human vs the assistant.
function MessageBubble({ message }) {
  const isCustomer = message.from === 'customer'
  const isAI = message.from === 'ai'
  // Align right for the customer (their own messages), left for everyone
  // else (admin, AI).
  const alignment = isCustomer ? 'justify-end' : 'justify-start'
  // Pick a style. AI uses glass-yellow so it stands out as the assistant
  // without impersonating the human "Habibizz Kitchens" reply.
  let bubbleClass
  if (isCustomer) {
    bubbleClass = 'bg-brand-yellow text-brand-black shadow-lg shadow-brand-yellow/20'
  } else if (isAI) {
    bubbleClass = 'glass-yellow text-brand-black'
  } else {
    bubbleClass = 'bg-white/10 text-brand-white border border-white/10 backdrop-blur shadow-lg'
  }
  // Sender label. The AI must never be labeled as the human shop.
  const label = isCustomer ? 'You' : isAI ? 'Habibizz Assistant' : 'Habibizz Kitchens'
  return (
    <div className={`flex ${alignment}`}>
      <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${bubbleClass}`}>
        <p className="text-xs font-bold uppercase mb-1 opacity-70">
          {label}
        </p>
        <p className="whitespace-pre-wrap break-words font-body">{message.text}</p>
        <p className="text-[10px] mt-1 opacity-60">{formatTime(message.timestamp)}</p>
      </div>
    </div>
  )
}
