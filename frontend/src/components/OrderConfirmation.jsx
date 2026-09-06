// OrderConfirmation - shown after a successful order
// Displays order number, estimated time, summary, and a cash reminder

export default function OrderConfirmation({ order, onClose }) {
  if (!order) return null

  // Estimate time based on fulfillment type
  const estimatedTime = order.fulfillmentType === 'Delivery' ? '30-45 minutes' : '15-20 minutes'

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black/85 backdrop-blur-md"
      role="dialog"
      aria-label="Order confirmation"
    >
      {/* Backdrop - click to close. z-10 sits below the modal panel
          so clicks land here instead of the panel. */}
      <button
        type="button"
        aria-label="Close order confirmation"
        onClick={onClose}
        className="absolute inset-0 z-10 cursor-default"
      />
      {/* Modal panel - top-anchored so the whole confirmation card
          stays in view on long pages (centering would push the
          BACK TO MENU button below the fold). */}
      <div className="relative z-20 text-brand-white w-full sm:max-w-lg sm:mx-auto sm:mt-4 mb-auto sm:mb-4 max-h-[95vh] sm:max-h-[calc(100vh-2rem)] overflow-y-auto sm:rounded-3xl bg-[#0D0D0D] border border-brand-yellow/30 shadow-2xl">
        {/* Header - gradient from yellow to warm yellow with a soft drop shadow */}
        <div className="bg-gradient-to-br from-brand-yellow to-brand-yellow-warm p-6 text-center text-brand-black shadow-lg shadow-brand-yellow/20">
          <div className="text-5xl mb-2">✓</div>
          <h2 className="font-display text-3xl">ORDER CONFIRMED</h2>
        </div>

        <div className="p-6">
          {/* Order number */}
          <div className="text-center mb-6">
            <p className="text-sm text-white/60 uppercase">Your order number</p>
            <p className="font-display text-4xl text-brand-yellow mt-1 drop-shadow-md">
              {order.orderNumber}
            </p>
          </div>

          {/* Estimated time */}
          <div className="bg-white/5 backdrop-blur border border-white/10 p-4 mb-6 text-center rounded-xl">
            <p className="text-sm text-white/60">Estimated time</p>
            <p className="font-display text-2xl text-brand-white">{estimatedTime}</p>
          </div>

          {/* Cash reminder */}
          <div className="glass-yellow p-4 mb-6 text-center text-brand-black rounded-xl">
            <p className="font-bold text-sm uppercase">
              Pay with cash when your order arrives.
            </p>
            <p className="text-xs mt-1 text-brand-black/70">
              {order.fulfillmentType === 'Delivery'
                ? 'Have exact change ready for our driver.'
                : 'Pay at the counter when picking up.'}
            </p>
          </div>

          {/* Order summary */}
          <div className="mb-6">
            <h3 className="font-display text-lg mb-2 text-brand-white">ORDER SUMMARY</h3>
            <ul className="space-y-2 text-sm text-white/80">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between">
                  <span>
                    {item.quantity}× {item.name}
                  </span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between font-display text-lg mt-4 pt-3 border-t border-white/10 text-brand-white">
              <span>TOTAL</span>
              <span className="text-brand-yellow">${order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Customer info */}
          <div className="text-sm text-white/70 mb-6">
            <p><strong>Name:</strong> {order.name}</p>
            <p><strong>Phone:</strong> {order.phone}</p>
            <p><strong>Fulfillment:</strong> {order.fulfillmentType}</p>
            {order.address && <p><strong>Address:</strong> {order.address}</p>}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full bg-brand-yellow text-brand-black font-bold py-3 hover:bg-brand-yellow-warm transition-colors rounded-full shadow-lg shadow-brand-yellow/20"
          >
            BACK TO MENU
          </button>
        </div>
      </div>
    </div>
  )
}