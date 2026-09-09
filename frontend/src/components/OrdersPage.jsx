// OrdersPage - /orders route. Lists every order this browser has placed,
// splitting them into "Active" (still being prepared) and "History" (completed).
// Polls each order from the backend so the status stays live.

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../apiClient'

// Statuses that mean "still in progress" - shown in the Active section.
const ACTIVE_STATUSES = ['new', 'preparing', 'ready']

// Friendly display text + glass-pill color for each status.
const STATUS_DISPLAY = {
  new: { label: 'Order received', color: 'glass-yellow text-brand-black' },
  preparing: { label: 'Being prepared', color: 'bg-orange-400/20 text-orange-200 border border-orange-400/40 backdrop-blur' },
  ready: { label: 'Ready for pickup', color: 'bg-green-400/20 text-green-200 border border-green-400/40 backdrop-blur' },
  completed: { label: 'Completed', color: 'bg-white/10 text-white/80 border border-white/15 backdrop-blur' },
}

const POLL_INTERVAL_MS = 5000

// localStorage key shared with the OrderTracker banner.
const STORAGE_KEY = 'habibizz-my-orders'

// Format a timestamp like "Sep 5, 2:14 PM"
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

export default function OrdersPage({ onReorder }) {
  // Each entry: { id, orderNumber, status, items?, total?, timestamp?, name?,
  //               fulfillmentType?, missing? } where `missing` means the server
  //               returned 404 for this id (order no longer exists).
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  // Track which ids we've already tried to fetch at least once - used to
  // decide when to stop showing the "Loading" spinner.
  const fetchedOnceRef = useRef(false)

  // Load saved order IDs on mount. The list in localStorage has the basic
  // shape { id, orderNumber, status } - the polling step enriches it.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setOrders(
            parsed.map((o) => ({
              id: o.id,
              orderNumber: o.orderNumber,
              status: o.status || 'new',
            }))
          )
        }
      }
    } catch (e) {
      console.error('Failed to read saved orders:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  // Poll each order's full details from the backend.
  useEffect(() => {
    if (orders.length === 0) return

    let cancelled = false

    const fetchOne = async (id) => {
      try {
        const res = await api(`/api/orders/${id}`)
        if (res.status === 404) return { id, missing: true }
        if (!res.ok) return null
        return await res.json()
      } catch {
        return null
      }
    }

    const tick = async () => {
      const updates = await Promise.all(orders.map((o) => fetchOne(o.id)))
      if (cancelled) return

      setOrders((prev) =>
        prev.map((entry, i) => {
          const update = updates[i]
          if (!update) return entry // network error, keep prior data
          if (update.missing) {
            return { ...entry, missing: true }
          }
          return {
            id: update.id,
            orderNumber: update.orderNumber,
            status: update.status,
            items: update.items,
            total: update.total,
            timestamp: update.timestamp,
            name: update.name,
            fulfillmentType: update.fulfillmentType,
            missing: false,
          }
        })
      )
      fetchedOnceRef.current = true
    }

    tick()
    const interval = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.length])

  // Persist any local-only changes (status, missing flag) back to localStorage
  // so the OrderTracker banner and any other readers stay in sync.
  useEffect(() => {
    if (orders.length === 0) return
    try {
      const minimal = orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
      }))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal))
    } catch (e) {
      console.error('Failed to persist orders:', e)
    }
  }, [orders])

  // Remove an order from the list + localStorage entirely.
  const handleRemove = (orderId) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId))
  }

  // Split into the two sections
  const active = orders.filter(
    (o) => !o.missing && ACTIVE_STATUSES.includes(o.status)
  )
  const history = orders.filter(
    (o) => o.missing || o.status === 'completed'
  )
  // Sort history newest first by timestamp (missing orders have no timestamp
  // so they end up at the end of the list naturally).
  history.sort((a, b) => {
    if (!a.timestamp) return 1
    if (!b.timestamp) return -1
    return new Date(b.timestamp) - new Date(a.timestamp)
  })

  return (
    <div className="bg-transparent text-brand-white">
      {/* Banner - solid black for high contrast on the page heading, with
          a soft yellow radial behind the H1 so it doesn't look flat. */}
      <section className="bg-black/60 backdrop-blur-xl text-brand-white py-16 sm:py-20 border-b border-white/10 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255, 212, 0, 0.12), transparent 70%)',
          }}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="font-display text-5xl sm:text-6xl mb-4">
            YOUR <span className="text-brand-yellow">ORDERS</span>
          </h1>
          <p className="text-lg text-white/80 font-body max-w-2xl mx-auto">
            Live status on every order you've placed, plus your full history.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-16 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading && (
            <div className="text-center py-12 text-white/60">Loading...</div>
          )}

          {!loading && orders.length === 0 && (
            <EmptyState />
          )}

          {/* ACTIVE section */}
          {!loading && active.length > 0 && (
            <div className="mb-12">
              <h2 className="font-display text-2xl sm:text-3xl mb-6 inline-block text-brand-white">
                ACTIVE
                <span
                  className="block h-1 mt-1 bg-gradient-to-r from-brand-yellow to-transparent"
                  aria-hidden="true"
                />
              </h2>
              <div className="space-y-4 mt-6">
                {active.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onRemove={handleRemove}
                    onReorder={onReorder}
                  />
                ))}
              </div>
            </div>
          )}

          {/* HISTORY section */}
          {!loading && history.length > 0 && (
            <div>
              <h2 className="font-display text-2xl sm:text-3xl mb-6 inline-block text-brand-white">
                HISTORY
                <span
                  className="block h-1 mt-1 bg-gradient-to-r from-brand-yellow to-transparent"
                  aria-hidden="true"
                />
              </h2>
              <div className="space-y-4 mt-6">
                {history.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onRemove={handleRemove}
                    onReorder={onReorder}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// Single order card. Renders differently for active vs history vs missing.
function OrderCard({ order, onRemove, onReorder }) {
  const display = STATUS_DISPLAY[order.status] || STATUS_DISPLAY.new
  const isActive = ACTIVE_STATUSES.includes(order.status) && !order.missing
  const isHistory = order.status === 'completed' && !order.missing
  const isMissing = !!order.missing

  return (
    <article
      className={`glass rounded-2xl p-5 transition-all hover:ring-1 hover:ring-brand-yellow/30 ${
        isMissing ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-display text-lg text-brand-white">
              {order.orderNumber}
            </h3>
            {isMissing ? (
              <span className="bg-white/10 text-white/70 text-xs font-bold px-2 py-1 rounded-full border border-white/15 backdrop-blur">
                No longer available
              </span>
            ) : (
              <span
                className={`${display.color} text-xs font-bold px-2 py-1 rounded-full`}
              >
                {display.label}
              </span>
            )}
          </div>
          <p className="text-xs text-white/60 font-body">
            {formatTime(order.timestamp)}
            {order.fulfillmentType ? ` - ${order.fulfillmentType}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isHistory && (
            <button
              onClick={() => onReorder(order)}
              className="bg-brand-yellow text-brand-black text-xs font-bold px-3 py-2 rounded-full hover:bg-brand-yellow-warm transition-colors shadow-lg shadow-brand-yellow/20"
              aria-label={`Reorder items from ${order.orderNumber}`}
            >
              ↺ REORDER
            </button>
          )}
          {(isHistory || isMissing) && (
            <button
              onClick={() => onRemove(order.id)}
              className="text-xs text-white/50 hover:text-red-400 underline font-body"
              aria-label={`Remove ${order.orderNumber} from list`}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Items list - shown for history and missing, so the customer can see
          what they ordered. For active orders the customer can see the same
          info in the bottom banner. */}
      {(isHistory || isMissing) && Array.isArray(order.items) && order.items.length > 0 && (
        <ul className="mt-4 pt-3 border-t border-white/10 space-y-1 text-sm font-body text-white/80">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>
                {item.quantity}× {item.name}
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </li>
          ))}
          {typeof order.total === 'number' && (
            <li className="flex justify-between font-bold pt-2 border-t border-white/10 text-brand-white">
              <span>Total</span>
              <span className="text-brand-yellow">${order.total.toFixed(2)}</span>
            </li>
          )}
        </ul>
      )}
    </article>
  )
}

function EmptyState() {
  return (
    <div className="glass rounded-2xl text-center py-16 px-6 max-w-md mx-auto">
      <div className="text-6xl mb-4" aria-hidden="true">🍔</div>
      <h2 className="font-display text-2xl mb-2 text-brand-white">No orders yet</h2>
      <p className="text-white/60 font-body mb-6">
        Once you place an order, it'll show up here so you can track it and reorder later.
      </p>
      <Link
        to="/menu"
        className="inline-block bg-brand-yellow text-brand-black font-bold px-6 py-3 hover:bg-brand-yellow-warm transition-colors font-display rounded-full shadow-lg shadow-brand-yellow/20"
      >
        BROWSE THE MENU
      </Link>
    </div>
  )
}
