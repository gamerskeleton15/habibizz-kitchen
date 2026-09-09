// TrackOrderModal - lets a customer look up any order by its HK-XXXX number.
// Auto-refreshes the order status every 5 seconds while the modal is open,
// so the customer can keep it open and watch their order move through stages.

import { useState, useEffect } from 'react'
import api from '../apiClient'

// Friendly status display (matches OrderTracker.jsx for visual consistency)
const STATUS_DISPLAY = {
  new: { label: 'Order received', color: 'glass-yellow text-brand-black' },
  preparing: { label: 'Being prepared', color: 'bg-orange-400/20 text-orange-200 border border-orange-400/40 backdrop-blur' },
  ready: { label: 'Ready for pickup', color: 'bg-green-400/20 text-green-200 border border-green-400/40 backdrop-blur' },
  completed: { label: 'Completed', color: 'bg-white/10 text-white/80 border border-white/15 backdrop-blur' },
}

// Render a small visual stepper: 4 dots showing progress (new -> preparing -> ready -> completed)
function StatusStepper({ status }) {
  const steps = ['new', 'preparing', 'ready', 'completed']
  const currentIndex = steps.indexOf(status)
  return (
    <div className="flex items-center justify-between my-4" aria-label={`Status: ${STATUS_DISPLAY[status]?.label || status}`}>
      {steps.map((s, i) => {
        const isPast = i <= currentIndex
        const isCurrent = i === currentIndex
        return (
          <div key={s} className="flex-1 flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${
                isPast
                  ? 'bg-brand-yellow border-brand-yellow text-brand-black'
                  : 'bg-white/10 border-white/15 text-white/50'
              } ${isCurrent ? 'ring-2 ring-brand-yellow ring-offset-2' : ''}`}
            >
              {isPast && i < currentIndex ? '✓' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-1 rounded-full ${
                  i < currentIndex ? 'bg-brand-yellow' : 'bg-white/10'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function TrackOrderModal({ isOpen, onClose }) {
  const [orderNumber, setOrderNumber] = useState('')
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Lock body + html scroll when open, and jump to top so the
  // modal is always fully in view. Reset state on close.
  useEffect(() => {
    if (!isOpen) {
      // Reset state when closing
      setOrder(null)
      setError(null)
      setOrderNumber('')
      setAutoRefresh(false)
      return
    }
    const previousScrollY = window.scrollY
    window.scrollTo({ top: 0, behavior: 'auto' })
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
      window.scrollTo({ top: previousScrollY, behavior: 'auto' })
    }
  }, [isOpen])

  // Poll for fresh status while auto-refresh is on (and modal is open)
  useEffect(() => {
    if (!autoRefresh || !order) return
    const tick = async () => {
      try {
        const res = await api(`/api/orders/track/${order.orderNumber}`)
        if (res.ok) {
          const fresh = await res.json()
          setOrder(fresh)
        }
      } catch (e) {
        // Silently fail on poll errors - we'll retry on the next tick
      }
    }
    const interval = setInterval(tick, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh, order])

  if (!isOpen) return null

  // Format the order number on submit (HK-4144 or hk-4144 or 4144)
  const formatOrderNumber = (raw) => {
    const cleaned = raw.trim().toUpperCase()
    if (cleaned.startsWith('HK-')) return cleaned
    if (/^\d+$/.test(cleaned)) return `HK-${cleaned}`
    return cleaned
  }

  // Look up an order
  const handleLookup = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formatted = formatOrderNumber(orderNumber)
    try {
      const res = await api(`/api/orders/track/${formatted}`)
      if (res.status === 404) {
        setError(`No order found with number ${formatted}. Double-check it.`)
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error('Lookup failed')
      const data = await res.json()
      setOrder(data)
      setAutoRefresh(true) // Start polling for live updates
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    }
    setLoading(false)
  }

  // Manual refresh button
  const handleRefresh = async () => {
    if (!order) return
    setLoading(true)
    try {
      const res = await api(`/api/orders/track/${order.orderNumber}`)
      if (res.ok) {
        const data = await res.json()
        setOrder(data)
      }
    } catch (e) {
      // ignore
    }
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-label="Track your order"
    >
      {/* Backdrop - click to close. z-10 sits below the modal panel
          so clicks land here instead of the panel. The panel above
          is at z-20. */}
      <button
        type="button"
        aria-label="Close track order"
        onClick={onClose}
        className="absolute inset-0 z-10 cursor-default"
      />
      {/* Modal panel - anchored to the top of the viewport with a
          top margin instead of centered. On tall pages, centering
          a tall modal pushed the action button off-screen below
          the fold, leaving the user staring at the backdrop blur
          with the modal off-screen. Top-anchored modals stay fully
          visible no matter how tall the page underneath is. */}
      <div
        className="relative z-20 text-brand-white w-full sm:max-w-md sm:mx-auto sm:mt-4 mb-auto sm:mb-4 max-h-[95vh] sm:max-h-[calc(100vh-2rem)] flex flex-col sm:rounded-3xl overflow-hidden bg-[#0D0D0D] border border-white/15 shadow-2xl"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-5 border-b border-brand-yellow/30 bg-black/60 backdrop-blur-xl">
          <h2 className="font-display text-2xl">TRACK ORDER</h2>
          <button
            onClick={onClose}
            className="text-3xl leading-none text-brand-white hover:text-brand-yellow"
            aria-label="Close track order"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!order ? (
            // Search form (shown when no order is loaded yet)
            <form onSubmit={handleLookup} className="space-y-4">
              <p className="text-sm text-white/70 font-body">
                Enter your order number to see live status updates.
              </p>
              <div>
                <label htmlFor="orderNumber" className="block font-bold text-sm mb-1 text-brand-white">
                  Order Number
                </label>
                <input
                  type="text"
                  id="orderNumber"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 px-3 py-2 text-brand-white placeholder-white/30 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow/40 focus:outline-none rounded-lg"
                  placeholder="HK-1234"
                  autoFocus
                />
              </div>
              {error && (
                <div className="text-red-300 text-sm bg-red-500/10 p-3 border border-red-500/30 rounded-lg">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-yellow text-brand-black font-bold py-3 hover:bg-brand-yellow-warm transition-colors disabled:opacity-50 rounded-full shadow-lg shadow-brand-yellow/20"
              >
                {loading ? 'LOOKING UP...' : 'TRACK ORDER'}
              </button>
              <p className="text-xs text-white/50 text-center">
                Order numbers look like <span className="font-mono text-white/80">HK-1234</span>
              </p>
            </form>
          ) : (
            // Order details (shown after lookup)
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-white/60 uppercase">Order</p>
                <p className="font-display text-3xl text-brand-white">{order.orderNumber}</p>
                <p className="text-sm mt-1 font-bold text-brand-yellow">
                  {STATUS_DISPLAY[order.status]?.label || order.status}
                </p>
              </div>

              {/* Status stepper */}
              <StatusStepper status={order.status} />

              {/* Current status badge */}
              <div
                className={`text-center px-3 py-2 font-bold rounded-full ${
                  STATUS_DISPLAY[order.status]?.color || 'bg-white/10 text-white/80'
                }`}
              >
                {STATUS_DISPLAY[order.status]?.label || order.status}
              </div>

              {/* Order details */}
              <div className="border-t border-white/10 pt-3 text-sm">
                <p className="text-white/70 mb-2">
                  <strong>Customer:</strong> {order.name}
                </p>
                <p className="text-white/70 mb-2">
                  <strong>Fulfillment:</strong> {order.fulfillmentType}
                </p>
                {order.address && (
                  <p className="text-white/70 mb-2">
                    <strong>Address:</strong> {order.address}
                  </p>
                )}
                <p className="text-white/70 mb-2">
                  <strong>Items:</strong>
                </p>
                <ul className="space-y-1 ml-4 list-disc text-white/80">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.quantity}× {item.name}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 font-display text-lg text-brand-white">
                  Total: ${order.total.toFixed(2)}
                </p>
                <p className="text-xs text-white/50 mt-1">
                  Payment: Cash on {order.fulfillmentType}
                </p>
              </div>

              {/* Auto-refresh notice + manual refresh */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                <p className="text-xs text-white/50">
                  {autoRefresh
                    ? 'Auto-refreshing every 5 seconds'
                    : 'Live updates paused'}
                </p>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="text-xs font-bold text-brand-yellow hover:text-yellow-300 underline"
                >
                  {loading ? 'Refreshing...' : 'Refresh now'}
                </button>
              </div>

              {/* Look up a different order */}
              <button
                onClick={() => {
                  setOrder(null)
                  setAutoRefresh(false)
                }}
                className="w-full text-sm text-white/60 hover:text-brand-white underline"
              >
                Track a different order
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}