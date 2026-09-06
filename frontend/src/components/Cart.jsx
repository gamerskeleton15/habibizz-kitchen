// Cart - slide-out drawer showing cart items with quantity controls
import { useEffect } from 'react'

export default function Cart({ isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem, onCheckout }) {
  // Lock the body scroll + jump to top so the cart drawer is always
  // visible when it opens. Without this, opening the cart from
  // somewhere lower on the page (e.g. after scrolling to a menu
  // section) leaves the viewport at the same scroll position, so on
  // mobile (where the cart is a full-screen panel) the user sees
  // "nothing" because the body is locked at a scroll offset where
  // nothing of interest is visible.
  useEffect(() => {
    if (!isOpen) return
    // Save the previous scroll position so we can restore it on close
    const previousScrollY = window.scrollY
    // Reset to top so the fixed drawer is fully in view
    window.scrollTo({ top: 0, behavior: 'auto' })
    // Lock body + html scroll while the cart is open. Locking both
    // matters because some browsers (notably iOS Safari and Chrome on
    // Android) will scroll the <html> instead of <body> if only one
    // is locked, and that "ghost scroll" can show blank space.
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)

    return () => {
      // Restore body + html scroll styles
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
      // Put the user back where they were before opening the cart
      window.scrollTo({ top: previousScrollY, behavior: 'auto' })
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Calculate subtotal
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  if (!isOpen) return null

  // Renders the list of cart items, or the empty-state message.
  // Kept as its own component so the drawer can choose between a
  // compact centered empty state and a scrolling list without
  // duplicating markup.
  const renderBody = () => {
    if (cartItems.length === 0) {
      return (
        // Empty state - centered in whatever vertical space the
        // body has. The `min-h-[40vh]` gives it some heft so the
        // icon + text don't look squished against the header.
        <div className="flex flex-col items-center justify-center text-center py-12 min-h-[40vh]">
          <div
            className="mb-4 w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              background:
                'radial-gradient(circle, rgba(255, 212, 0, 0.15), transparent 70%)',
            }}
            aria-hidden="true"
          >
            <svg
              className="w-10 h-10 text-brand-yellow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <p className="text-white/80 font-display text-xl mb-1">Your cart is empty</p>
          <p className="text-white/50 text-sm font-body max-w-xs">
            Browse the menu and add some bold flavor.
          </p>
        </div>
      )
    }
    return (
      <ul className="space-y-4">
        {cartItems.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 pb-4 border-b border-white/10"
          >
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base text-brand-white truncate">
                {item.name}
              </h3>
              <p className="text-sm text-white/60">${item.price.toFixed(2)} each</p>
              {/* Quantity controls */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  className="w-8 h-8 bg-white/10 text-brand-white font-bold hover:bg-brand-yellow hover:text-brand-black transition-all duration-200 rounded-full hover:scale-110 active:scale-95"
                  aria-label={`Decrease quantity of ${item.name}`}
                >
                  −
                </button>
                <span className="font-bold w-6 text-center text-brand-white">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 bg-white/10 text-brand-white font-bold hover:bg-brand-yellow hover:text-brand-black transition-all duration-200 rounded-full hover:scale-110 active:scale-95"
                  aria-label={`Increase quantity of ${item.name}`}
                >
                  +
                </button>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-brand-yellow">
                ${(item.price * item.quantity).toFixed(2)}
              </p>
              <button
                onClick={() => onRemoveItem(item.id)}
                className="text-red-400 text-sm hover:text-red-300 hover:underline mt-2"
                aria-label={`Remove ${item.name} from cart`}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer - dark glass over the aurora, the backdrop blur creates
          a real frosted panel where the body shows through.

          Sizing notes:
          - On mobile (default): full-screen sheet, no inset (clears
            the whole viewport). Header at top, scrolling items list
            below, and the Subtotal + Checkout button rendered
            inline right after the last item so the user scrolls
            naturally into it.
          - On sm+ (desktop / tablet): the drawer becomes a FLOATING
            panel anchored to the top-right with a 1rem margin,
            capped at 28rem wide and (viewport - 2rem) tall. Same
            internal layout. */}
      <aside
        className="fixed inset-0 sm:inset-y-4 sm:inset-x-auto sm:right-4 sm:max-w-md sm:max-h-[calc(100vh-2rem)] bg-black/95 text-brand-white z-50 flex flex-col sm:rounded-2xl sm:border sm:border-white/10 sm:overflow-hidden sm:shadow-2xl"
        role="dialog"
        aria-label="Shopping cart"
      >
        {/* Header - sits at the top of the flex column. On mobile, the
            top padding uses the iOS safe-area-inset so the title isn't
            hidden under the notch. On sm+ we don't need that inset
            because the drawer floats inside the viewport with its own
            rounded corners. */}
        <div
          className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-brand-yellow/30 bg-black/95"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}
        >
          <div>
            <h2 className="font-display text-2xl">YOUR CART</h2>
            {cartItems.length > 0 && (
              <p className="text-xs text-white/50 font-body mt-0.5">
                {cartItems.reduce((s, i) => s + i.quantity, 0)} item
                {cartItems.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-brand-white hover:text-brand-yellow text-3xl leading-none"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        {/* Cart body - scrolling region. Contains either the empty
            state, the list of items, or the items list followed
            by the Subtotal + Checkout block (which sits at the
            end of the list, after the last item, as a single
            in-flow block the user scrolls naturally into). */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-5 py-4"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
        >
          {renderBody()}

          {/* Subtotal + Checkout - inline at the end of the items
              list. The user scrolls through their items and lands
              on this block as the natural conclusion. It is NOT
              sticky, so the user always sees the full list above
              it when they reach the button. */}
          {cartItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="font-display text-base sm:text-lg text-white/80">SUBTOTAL</span>
                <span className="font-display text-xl sm:text-2xl text-brand-yellow">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <button
                onClick={onCheckout}
                className="w-full bg-brand-yellow text-brand-black font-bold text-sm sm:text-base py-3 hover:bg-brand-yellow-warm transition-colors rounded-full shadow-lg shadow-brand-yellow/20"
              >
                CHECKOUT · ${subtotal.toFixed(2)}
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
