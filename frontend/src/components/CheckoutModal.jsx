// CheckoutModal - collects customer details and submits the order
// Payment method is locked to Cash on Delivery / Cash on Pickup (no online payment)

import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider'

export default function CheckoutModal({ isOpen, onClose, cartItems, onOrderComplete }) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [fulfillmentType, setFulfillmentType] = useState('Pickup')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // When the user is logged in, pre-fill the name field with their
  // profile name. We only set this on open so they can still edit it
  // - and so re-opening after editing doesn't reset their typed value
  // until the modal is actually shown again.
  useEffect(() => {
    if (isOpen && user && !name) {
      setName(user.name || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user])

  // Lock body + html scroll when open, and jump to top so the
  // modal is always fully in view (same fix as Cart.jsx — without
  // this, opening checkout from a scrolled-down position left the
  // user staring at blank space on mobile).
  useEffect(() => {
    if (!isOpen) return
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

  if (!isOpen) return null

  // Compute total
  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  // Submit the order
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    // Validation
    if (!name.trim() || !phone.trim()) {
      setError('Please enter your name and phone number.')
      setSubmitting(false)
      return
    }
    if (fulfillmentType === 'Delivery' && !address.trim()) {
      setError('Please enter a delivery address.')
      setSubmitting(false)
      return
    }

    // Format cart items for the API
    const orderItems = cartItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    }))

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          address: fulfillmentType === 'Delivery' ? address : '',
          fulfillmentType,
          notes,
          items: orderItems,
        }),
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Failed to place order')
      }

      const data = await response.json()
      onOrderComplete(data.order)
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-label="Checkout"
    >
      {/* Backdrop - click to close. z-10 sits below the modal panel
          so clicks land here instead of the panel. The panel above
          is at z-20. */}
      <button
        type="button"
        aria-label="Close checkout"
        onClick={onClose}
        className="absolute inset-0 z-10 cursor-default"
        disabled={submitting}
      />
      {/* Modal panel - top-anchored with a top margin. Centering a
          tall modal on a long page pushed the PLACE ORDER button
          below the fold; anchoring to the top keeps the whole
          modal visible no matter the page height. */}
      <div
        className="relative z-20 text-brand-white w-full sm:max-w-lg sm:mx-auto sm:mt-4 mb-auto sm:mb-4 max-h-[95vh] sm:max-h-[calc(100vh-2rem)] flex flex-col sm:rounded-3xl overflow-hidden bg-[#0D0D0D] border border-white/15 shadow-2xl"
      >
        <div
          className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-brand-yellow/30 bg-black/60 backdrop-blur-xl"
          style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
        >
          <h2 className="font-display text-2xl">CHECKOUT</h2>
          <button
            onClick={onClose}
            className="text-3xl leading-none text-brand-white hover:text-brand-yellow"
            aria-label="Close checkout"
            disabled={submitting}
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4"
        >
          {/* Name */}
          <div>
            <label htmlFor="name" className="block font-bold text-sm mb-1 text-brand-white">
              Your Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 px-3 py-2 text-brand-white placeholder-white/30 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow/40 focus:outline-none rounded-lg"
              placeholder="John Doe"
            />
            {user && (
              <p className="mt-1 text-xs text-white/50">
                Signed in as <span className="text-brand-yellow">{user.name}</span> via {user.provider}. You can still edit this.
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block font-bold text-sm mb-1 text-brand-white">
              Phone *
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 px-3 py-2 text-brand-white placeholder-white/30 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow/40 focus:outline-none rounded-lg"
              placeholder="555-123-4567"
            />
          </div>

          {/* Fulfillment type */}
          <div>
            <span className="block font-bold text-sm mb-1 text-brand-white">Fulfillment</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFulfillmentType('Pickup')}
                className={`flex-1 py-2 font-bold border rounded-full transition-all backdrop-blur ${
                  fulfillmentType === 'Pickup'
                    ? 'glass-yellow text-brand-black'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                PICKUP
              </button>
              <button
                type="button"
                onClick={() => setFulfillmentType('Delivery')}
                className={`flex-1 py-2 font-bold border rounded-full transition-all backdrop-blur ${
                  fulfillmentType === 'Delivery'
                    ? 'glass-yellow text-brand-black'
                    : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                }`}
              >
                DELIVERY
              </button>
            </div>
          </div>

          {/* Address - shown only if delivery */}
          {fulfillmentType === 'Delivery' && (
            <div>
              <label htmlFor="address" className="block font-bold text-sm mb-1 text-brand-white">
                Delivery Address *
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                rows={2}
                className="w-full bg-white/5 border border-white/10 px-3 py-2 text-brand-white placeholder-white/30 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow/40 focus:outline-none rounded-lg"
                placeholder="123 Main St, Apt 4B"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block font-bold text-sm mb-1 text-brand-white">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 px-3 py-2 text-brand-white placeholder-white/30 focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow/40 focus:outline-none rounded-lg"
              placeholder="No pickles, extra sauce, etc."
            />
          </div>

          {/* Payment method - read-only label, no input */}
          <div>
            <span className="block font-bold text-sm mb-1 text-brand-white">Payment Method</span>
            <div className="glass-yellow px-3 py-2 font-bold text-brand-black rounded-lg">
              {fulfillmentType === 'Delivery' ? 'Cash on Delivery' : 'Cash on Pickup'}
            </div>
            <p className="text-xs text-white/50 mt-1">
              Pay with cash when your order arrives or at pickup.
            </p>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center py-3 border-t border-white/10">
            <span className="font-display text-lg text-brand-white">TOTAL</span>
            <span className="font-display text-2xl bg-gradient-to-r from-brand-yellow to-yellow-300 bg-clip-text text-transparent">
              ${total.toFixed(2)}
            </span>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-red-300 text-sm bg-red-500/10 p-3 border border-red-500/30 rounded-lg">
              {error}
            </div>
          )}
        </form>

        {/* Submit - sticky at the bottom of the modal so the
            PLACE ORDER button is always visible without scrolling.
            Safe-area-inset-bottom keeps the button clear of the iOS
            home indicator. */}
        <div
          className="shrink-0 p-5 border-t border-brand-yellow/30 bg-black/90 backdrop-blur-xl shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.6)]"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || cartItems.length === 0}
            className="w-full bg-brand-yellow text-brand-black font-bold py-3 hover:bg-brand-yellow-warm transition-all rounded-full shadow-lg shadow-brand-yellow/20 disabled:opacity-50"
          >
            {submitting ? 'PLACING ORDER...' : 'PLACE ORDER'}
          </button>
        </div>
      </div>
    </div>
  )
}