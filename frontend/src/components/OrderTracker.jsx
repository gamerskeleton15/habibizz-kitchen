// OrderTracker - a fixed bottom-of-screen banner that shows live order status.
// Reads active order IDs from localStorage and polls them on a timer.
// Customers can dismiss the banner once an order is "completed".
// When an order becomes "ready" a full-screen celebration overlay fires.

import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

// Friendly status text + glass-pill color for the customer-facing banner
const STATUS_DISPLAY = {
  new: { label: 'Order received', color: 'glass-yellow text-brand-black' },
  preparing: { label: 'Being prepared', color: 'bg-orange-400/20 text-orange-200 border border-orange-400/40 backdrop-blur' },
  ready: { label: 'Ready for pickup', color: 'bg-green-400/20 text-green-200 border border-green-400/40 backdrop-blur' },
  completed: { label: 'Completed', color: 'bg-white/10 text-white/80 border border-white/15 backdrop-blur' },
}

const POLL_INTERVAL_MS = 5000

// A cheerful two-tone chime: the shopkeeper just moved your order to "ready".
// Plays once when an order transitions to ready; silently ignored if blocked.
const playReadyChime = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    const note = (freq, start, dur) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02)
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    }

    note(523, 0.0, 0.25)  // C5
    note(659, 0.15, 0.25) // E5
    note(784, 0.30, 0.35) // G5 — resolves the cheerful chord
  } catch (e) {
    // Audio might be blocked before a user gesture; silently fail
  }
}

export default function OrderTracker() {
  // Map of orderId -> order data (or null if not yet fetched)
  const [trackedOrders, setTrackedOrders] = useState([])
  const [minimized, setMinimized] = useState(false)
  // Track which order IDs have already triggered the "ready" celebration
  // so it only fires once per order (not every poll cycle).
  const knownReadyIdsRef = useRef(new Set())
  // The order that just became ready, shown in the full-screen overlay.
  const [readyOrder, setReadyOrder] = useState(null)

  // Load tracked order IDs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('habibizz-my-orders')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          // Only show non-completed orders
          setTrackedOrders(parsed.filter((o) => o.status !== 'completed'))
        }
      }
    } catch (e) {
      console.error('Failed to read tracked orders:', e)
    }
  }, [])

  // Poll each tracked order every 5s and update its status
  useEffect(() => {
    if (trackedOrders.length === 0) return

    const fetchStatus = async (orderId) => {
      try {
        const res = await fetch(`/api/orders/${orderId}`)
        if (!res.ok) return null
        return await res.json()
      } catch {
        return null
      }
    }

    const tick = async () => {
      const updates = await Promise.all(
        trackedOrders.map(async (entry) => {
          const fresh = await fetchStatus(entry.id)
          if (!fresh) return entry
          return {
            id: fresh.id,
            orderNumber: fresh.orderNumber,
            status: fresh.status,
          }
        })
      )
      setTrackedOrders(updates)

      // Fire the "ready" celebration the first time an order transitions
      // to ready. knownReadyIdsRef guards against re-triggering on every
      // subsequent poll (and against showing it for orders already ready).
      for (const o of updates) {
        if (
          o.status === 'ready' &&
          !knownReadyIdsRef.current.has(o.id) &&
          !readyOrder
        ) {
          knownReadyIdsRef.current.add(o.id)
          playReadyChime()
          setReadyOrder(o)
        }
      }
    }

    tick()
    const interval = setInterval(tick, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [trackedOrders.length])

  // Persist the current tracked orders list to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('habibizz-my-orders', JSON.stringify(trackedOrders))
    } catch (e) {
      console.error('Failed to save tracked orders:', e)
    }
  }, [trackedOrders])

  // Dismiss a completed order (removes it from the list and localStorage)
  const handleDismiss = (orderId) => {
    setTrackedOrders((prev) => prev.filter((o) => o.id !== orderId))
  }

  // Hide the entire banner
  const handleMinimize = () => {
    setMinimized(true)
  }

  // Dismiss the "ready" celebration overlay.
  const handleCloseReady = () => setReadyOrder(null)

  if (trackedOrders.length === 0) return null

  // Single "collapsed" view: just one badge summarizing how many active orders
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 z-40 glass-yellow text-brand-black font-bold px-4 py-2 shadow-lg shadow-brand-yellow/30 rounded-full hover:brightness-110"
        aria-label="Show order tracker"
      >
        🍔 {trackedOrders.length} active order
        {trackedOrders.length !== 1 ? 's' : ''}
      </button>
    )
  }

  return (
    <>
      {/* Full-screen "your order is ready" celebration. Shows the moment a
          tracked order flips to 'ready' (with a chime), and can be swiped
          away with "Got it". */}
      {readyOrder && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0D0D0D]/95 backdrop-blur-md p-6">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vmin] h-[80vmin] rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,212,0,0.35), transparent 70%)' }} />
          </div>
          <div className="relative z-10 max-w-sm w-full text-center">
            <div
              className="mx-auto mb-5 w-20 h-20 rounded-full flex items-center justify-center animate-bounce"
              style={{
                background:
                  'radial-gradient(circle, rgba(255, 212, 0, 0.25), transparent 70%)',
              }}
              aria-hidden="true"
            >
              <span className="text-4xl">🍔</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl text-brand-white mb-2">
              YOUR ORDER IS{' '}
              <span className="text-brand-yellow drop-shadow-md">READY!</span>
            </h2>
            <p className="font-display text-lg text-brand-yellow mb-3">
              {readyOrder.orderNumber}
            </p>
            <p className="text-white/70 font-body mb-8">
              It's ready for pickup. Head over to collect it — the tracker at
              the bottom will update as you go. Thanks for ordering with us!
            </p>
            <button
              onClick={handleCloseReady}
              className="bg-brand-yellow text-brand-black font-display text-lg uppercase tracking-wider px-8 py-3 rounded-full shadow-xl shadow-brand-yellow/30 hover:bg-brand-yellow-warm transition-all duration-300 hover:-translate-y-0.5"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-black/70 backdrop-blur-2xl text-brand-white border-t border-brand-yellow/30 shadow-2xl"
        role="region"
        aria-label="Active order tracking"
      >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <h3 className="font-display text-sm text-brand-yellow">YOUR ORDERS</h3>
          <div className="flex items-center gap-3">
            <Link
              to="/orders"
              className="text-white/80 hover:text-brand-yellow text-xs underline font-body"
            >
              View all
            </Link>
            <button
              onClick={handleMinimize}
              className="text-white/60 hover:text-brand-yellow text-xs"
              aria-label="Minimize order tracker"
            >
              Minimize
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {trackedOrders.map((order) => {
            const display = STATUS_DISPLAY[order.status] || STATUS_DISPLAY.new
            const isCompleted = order.status === 'completed'
            return (
              <div
                key={order.id}
                className="flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-display text-sm text-brand-yellow">
                    {order.orderNumber}
                  </span>
                  <span
                    className={`${display.color} text-xs font-bold px-2 py-1 rounded-full`}
                  >
                    {display.label}
                  </span>
                </div>
                {isCompleted && (
                  <button
                    onClick={() => handleDismiss(order.id)}
                    className="text-xs text-white/80 hover:text-brand-yellow underline"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
      </div>
    </>
  )
}