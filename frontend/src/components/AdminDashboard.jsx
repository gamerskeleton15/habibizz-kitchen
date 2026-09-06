// AdminDashboard - the shopkeeper's live view of incoming orders.
// Polls the backend every few seconds and shows orders grouped by status.
// Plays a beep sound when a brand-new order arrives.
//
// Protected by an admin login (AdminLogin component). We read the session
// token from localStorage and send it on every request.

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import AdminLogin from './AdminLogin'
import SupportColumn from './SupportColumn'

const TOKEN_KEY = 'habibizz-admin-token'

// Status columns shown left to right on the dashboard
const STATUSES = [
  { key: 'new', label: 'New', color: 'bg-brand-yellow text-brand-black' },
  { key: 'preparing', label: 'Preparing', color: 'bg-orange-400 text-brand-black' },
  { key: 'ready', label: 'Ready', color: 'bg-green-400 text-brand-black' },
  { key: 'completed', label: 'Completed', color: 'bg-gray-300 text-brand-black' },
]

// Play a short beep using the Web Audio API.
// We synthesize it in code so we don't need an audio file.
const playNewOrderBeep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch (e) {
    // Audio might be blocked before a user gesture; silently fail
  }
}

// A higher-pitched double-pulse to flag an AI escalation. Distinct
// frequency + double-beat so the shopkeeper can tell it apart from a
// new-order beep without looking at the screen.
const playEscalationBeep = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 1175 // D6 - much higher than the 880Hz order beep
    osc.type = 'sine'
    // First pulse
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.18)
    // Brief gap, then a second pulse
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.26)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.45)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
  } catch (e) {
    // ignore
  }
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Token starts null; we look it up in localStorage on mount.
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null
    } catch {
      return null
    }
  })
  // Track which order IDs we've already seen so we only beep for truly new ones
  const knownIdsRef = useRef(new Set())
  // Ref to suppress the very first beep on page load (everything is "new")
  const isFirstFetchRef = useRef(true)
  // Same idea for AI escalations: track which thread IDs are currently
  // flagged so we only beep when a new one shows up.
  const knownEscalatedIdsRef = useRef(new Set())
  const isFirstSupportFetchRef = useRef(true)

  // Poll the backend every 5 seconds
  useEffect(() => {
    if (!token) return // don't poll until we have a valid session

    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/orders', {
          headers: { 'x-admin-token': token },
        })
        // If the server says we're not authorized, kick back to the login screen
        if (res.status === 401) {
          handleLogout()
          return
        }
        if (!res.ok) throw new Error('Failed to fetch orders')
        const data = await res.json()

        // Detect brand-new orders (not seen on a previous poll)
        if (!isFirstFetchRef.current) {
          const incomingIds = new Set(data.map(o => o.id))
          const fresh = data.filter(
            (o) => !knownIdsRef.current.has(o.id) && o.status === 'new'
          )
          if (fresh.length > 0) {
            playNewOrderBeep()
          }
          knownIdsRef.current = incomingIds
        } else {
          // On first fetch, just record all existing order IDs without beeping
          knownIdsRef.current = new Set(data.map(o => o.id))
          isFirstFetchRef.current = false
        }

        setOrders(data)
        setError(null)
        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }

    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Poll the support threads and beep when a thread gets escalated by
  // the AI. Same 5s cadence as the order poll, but its own ref so a
  // single notification doesn't get tangled with new-order detection.
  useEffect(() => {
    if (!token) return
    let cancelled = false

    const fetchSupport = async () => {
      try {
        const res = await fetch('/api/support/threads', {
          headers: { 'x-admin-token': token },
        })
        if (res.status === 401) {
          handleLogout()
          return
        }
        if (!res.ok) throw new Error('Failed to fetch support threads')
        const data = await res.json()
        if (cancelled) return

        const incomingNeedsAttention = new Set(
          (data.threads || [])
            .filter((t) => t.needsAttention)
            .map((t) => t.id)
        )

        if (!isFirstSupportFetchRef.current) {
          // Beep for any thread that just entered needsAttention. Compare
          // against what we knew last poll, not the previous ref state,
          // so a single escalation only fires one beep (not one per
          // poll until the admin replies).
          for (const id of incomingNeedsAttention) {
            if (!knownEscalatedIdsRef.current.has(id)) {
              playEscalationBeep()
              break // one beep per poll cycle, even if multiple escalate
            }
          }
          knownEscalatedIdsRef.current = incomingNeedsAttention
        } else {
          // First load - record everything silently.
          knownEscalatedIdsRef.current = incomingNeedsAttention
          isFirstSupportFetchRef.current = false
        }
      } catch (e) {
        // Network blip - keep the previous state so we don't miss
        // escalations, just try again next tick.
      }
    }

    fetchSupport()
    const interval = setInterval(fetchSupport, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Logout: tell the server to invalidate the token, then clear local state
  const handleLogout = async () => {
    try {
      if (token) {
        await fetch('/api/admin/logout', {
          method: 'POST',
          headers: { 'x-admin-token': token },
        })
      }
    } catch {
      // Even if the network call fails, we still want to log out locally
    }
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // ignore
    }
    setToken(null)
    setOrders([])
    knownIdsRef.current = new Set()
    isFirstFetchRef.current = true
    // Reset support-escalation tracking too, so re-login doesn't
    // immediately beep for already-known escalations.
    knownEscalatedIdsRef.current = new Set()
    isFirstSupportFetchRef.current = true
  }

  // Update an order's status (move to next column)
  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': token,
        },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.status === 401) {
        handleLogout()
        return
      }
      if (!res.ok) throw new Error('Failed to update status')

      // Update local state so the UI reflects the change immediately
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      )
    } catch (err) {
      alert('Could not update order: ' + err.message)
    }
  }

  // Format a timestamp like "Sep 5, 2:14 PM"
  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  // --- Stats derived from the already-fetched orders list -------------
  // All computed client-side so we don't need a separate endpoint. The
  // dashboard already has every order in memory, so summing is cheap.

  const computeStats = (orderList) => {
    const todayStr = new Date().toDateString()
    let salesToday = 0
    let ordersToday = 0
    const itemCount = {} // name -> qty sold across all orders
    const hourCount = {} // "5 PM" -> number of orders placed in that hour

    for (const o of orderList) {
      const ts = new Date(o.timestamp)
      if (ts.toDateString() === todayStr) {
        ordersToday += 1
        salesToday += o.total || 0
      }
      const hr = ts.toLocaleTimeString([], { hour: 'numeric' })
      hourCount[hr] = (hourCount[hr] || 0) + 1

      for (const item of o.items || []) {
        itemCount[item.name || 'Item'] =
          (itemCount[item.name] || 0) + (item.quantity || 1)
      }
    }

    // Most popular item = highest quantity sold
    let popular = { name: '—', count: 0 }
    for (const [name, count] of Object.entries(itemCount)) {
      if (count > popular.count) popular = { name, count }
    }

    // Peak hour = hour with the most orders
    let peak = { label: '—', count: 0 }
    for (const [label, count] of Object.entries(hourCount)) {
      if (count > peak.count) peak = { label, count }
    }

    return { salesToday, ordersToday, totalOrders: orderList.length, popular, peak }
  }

  const stats = computeStats(orders)

  // If we don't have a token, show the login screen instead of the dashboard
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
              <span className="text-brand-yellow">HABI</span>BIZZ ADMIN
            </h1>
            <p className="text-sm text-brand-white/60 mt-1 font-body">
              Live order board - auto-refreshes every 5 seconds
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/admin/history"
              className="text-brand-yellow hover:text-brand-white text-sm font-bold underline"
            >
              History
            </Link>
            <Link
              to="/admin/menu"
              className="text-brand-yellow hover:text-brand-white text-sm font-bold underline"
            >
              Edit Menu
            </Link>
            <Link
              to="/"
              className="text-brand-yellow hover:text-brand-white text-sm font-bold underline"
            >
              ← Back to Store
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

      {/* Loading / Error states */}
      {loading && (
        <div className="text-center py-12 text-gray-600">Loading orders...</div>
      )}
      {error && (
        <div className="text-center py-12 text-red-600">
          Could not load orders: {error}. Make sure the backend is running on port 4000.
        </div>
      )}

      {/* Stats row - a quick pulse on today's business. Derived from the
          orders already in memory. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border-2 border-gray-200 p-4">
            <p className="text-xs font-display uppercase tracking-wider text-gray-500 mb-1">
              Sales Today
            </p>
            <p className="font-display text-2xl text-brand-black">
              ${stats.salesToday.toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">{stats.ordersToday} order{stats.ordersToday !== 1 ? 's' : ''} today</p>
          </div>

          <div className="bg-white border-2 border-gray-200 p-4">
            <p className="text-xs font-display uppercase tracking-wider text-gray-500 mb-1">
              Total Orders
            </p>
            <p className="font-display text-2xl text-brand-black">{stats.totalOrders}</p>
            <p className="text-xs text-gray-400">all time</p>
          </div>

          <div className="bg-white border-2 border-gray-200 p-4">
            <p className="text-xs font-display uppercase tracking-wider text-gray-500 mb-1">
              Top Item
            </p>
            <p className="font-display text-xl text-brand-black leading-tight">
              {stats.popular.name}
            </p>
            <p className="text-xs text-gray-400">{stats.popular.count} sold</p>
          </div>

          <div className="bg-white border-2 border-gray-200 p-4">
            <p className="text-xs font-display uppercase tracking-wider text-gray-500 mb-1">
              Peak Hour
            </p>
            <p className="font-display text-2xl text-brand-black">{stats.peak.label}</p>
            <p className="text-xs text-gray-400">{stats.peak.count} order{stats.peak.count !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Status columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {STATUSES.map((status) => {
            const statusOrders = orders.filter((o) => o.status === status.key)
            return (
              <div
                key={status.key}
                className="bg-white border-2 border-gray-200 flex flex-col"
              >
                {/* Column header */}
                <div
                  className={`${status.color} px-4 py-3 flex items-center justify-between`}
                >
                  <h2 className="font-display text-lg">{status.label}</h2>
                  <span className="bg-brand-black text-brand-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {statusOrders.length}
                  </span>
                </div>

                {/* Order cards */}
                <div className="p-3 space-y-3 min-h-[200px] flex-1">
                  {statusOrders.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">
                      No orders
                    </p>
                  ) : (
                    statusOrders.map((order) => (
                      <div
                        key={order.id}
                        className="border-2 border-gray-200 p-3 bg-white"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-display text-sm">
                            {order.orderNumber}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTime(order.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm font-bold mb-1">{order.name}</p>
                        <p className="text-xs text-gray-600 mb-2">
                          {order.phone} - {order.fulfillmentType}
                        </p>
                        {order.address && (
                          <p className="text-xs text-gray-500 mb-2 italic">
                            📍 {order.address}
                          </p>
                        )}
                        <ul className="text-xs space-y-1 mb-2 border-t border-gray-100 pt-2">
                          {order.items.map((item) => (
                            <li key={item.id} className="flex justify-between">
                              <span>
                                {item.quantity}× {item.name}
                              </span>
                              <span>${(item.price * item.quantity).toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                        {order.notes && (
                          <p className="text-xs bg-yellow-50 p-2 mb-2 border-l-2 border-brand-yellow">
                            📝 {order.notes}
                          </p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                          <span className="font-display text-sm">
                            ${order.total.toFixed(2)}
                          </span>
                          {getNextStatusButton(order, handleStatusUpdate)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}

          {/* Support column - shows open thread count + unread badge. Wraps
              into the grid on xl, stacks on smaller breakpoints. */}
          <SupportColumn />
        </div>
      </div>
    </div>
  )
}

// Render a button that moves an order to the next status.
// The "Completed" column has no next button.
function getNextStatusButton(order, handleStatusUpdate) {
  const nextMap = {
    new: 'preparing',
    preparing: 'ready',
    ready: 'completed',
    completed: null,
  }
  const next = nextMap[order.status]
  if (!next) {
    return (
      <span className="text-xs text-gray-400 font-bold">✓ Done</span>
    )
  }
  return (
    <button
      onClick={() => handleStatusUpdate(order.id, next)}
      className="bg-brand-yellow text-brand-black text-xs font-display uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg shadow-brand-yellow/30 hover:shadow-xl hover:shadow-brand-yellow/40 hover:bg-brand-yellow-warm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
    >
      {next.toUpperCase()} →
    </button>
  )
}