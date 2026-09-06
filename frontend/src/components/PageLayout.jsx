// PageLayout - shared chrome for all non-admin pages.
// Renders the customer Navbar, the page content, the Footer, and the
// cart/checkout/track modals. Cart state lives in the parent (Home)
// so it persists across navigations.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import Cart from './Cart'
import CheckoutModal from './CheckoutModal'
import OrderConfirmation from './OrderConfirmation'
import OrderTracker from './OrderTracker'
import TrackOrderModal from './TrackOrderModal'
import CursorGlow from './CursorGlow'
import { useAuth } from '../auth/AuthProvider'

export default function PageLayout({ children }) {
  // Login is optional for browsing but REQUIRED before a customer can add
  // anything to the cart or check out. Guests can look at the menu freely;
  // the moment they try to add to cart (or reorder / check out) they're
  // sent to /login. See requireLogin() below.
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  // Remember where the guest was heading and bounce them to /login. After
  // they sign in, AuthProvider reads the saved path and navigates back.
  const requireLogin = () => {
    try {
      sessionStorage.setItem('habibizz-redirect', window.location.pathname)
    } catch (e) {
      // sessionStorage unavailable - just go to login without a redirect.
    }
    navigate('/login')
  }

  // Cart state - initialized from localStorage so it survives page navigation
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('habibizz-cart')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isTrackOpen, setIsTrackOpen] = useState(false)
  const [orderComplete, setOrderComplete] = useState(null)

  // Persist cart to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem('habibizz-cart', JSON.stringify(cartItems))
    } catch (err) {
      console.error('Failed to save cart to localStorage:', err)
    }
  }, [cartItems])

  const handleAddToCart = (item) => {
    // Guests can browse items but not add them to the cart. While the
    // initial /auth/me is still loading we hold off so a signed-in user
    // isn't wrongly redirected.
    if (loading) return
    if (!user) return requireLogin()
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    setIsCartOpen(true)
  }

  // Reorder: replace the cart with a previous order's items and open the drawer.
  // Used by /orders when a customer clicks "Reorder" on a completed order.
  const handleReorder = (order) => {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) return
    // Reordering puts items in the cart, which also requires a login.
    if (loading) return
    if (!user) return requireLogin()
    // Normalize each line: keep id/name/price/description/category from the saved
    // order so the cart drawer shows the same item the customer had before.
    const items = order.items.map((line) => ({
      id: line.id,
      name: line.name,
      price: line.price,
      description: line.description || '',
      category: line.category || '',
      quantity: line.quantity || 1,
    }))
    setCartItems(items)
    setIsCartOpen(true)
  }

  const handleUpdateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(id)
      return
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  const handleRemoveItem = (id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleCheckout = () => {
    // Belt-and-braces: even if a guest has stale items in the cart from
    // before, they can't check out without signing in.
    if (loading) return
    if (!user) return requireLogin()
    setIsCartOpen(false)
    setIsCheckoutOpen(true)
  }

  const handleOrderComplete = (order) => {
    setIsCheckoutOpen(false)
    setOrderComplete(order)
    setCartItems([])
    // Save the order to "my orders" for the OrderTracker
    try {
      const existing = JSON.parse(
        localStorage.getItem('habibizz-my-orders') || '[]'
      )
      existing.push({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
      })
      localStorage.setItem('habibizz-my-orders', JSON.stringify(existing))
    } catch (e) {
      console.error('Failed to save order for tracking:', e)
    }
  }

  const handleCloseConfirmation = () => {
    setOrderComplete(null)
  }

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  // Inject the "add to cart" handler into the page tree via a render prop.
  // Pages that show menu items call `children({ onAddToCart })`.
  return (
    <div className="min-h-screen flex flex-col pb-24 relative">
      <CursorGlow />
      <Navbar
        cartCount={cartCount}
        onCartClick={() => setIsCartOpen(true)}
        onTrackClick={() => setIsTrackOpen(true)}
      />

      <main className="flex-1 page-fade relative z-10">
        {typeof children === 'function'
          ? children({ onAddToCart: handleAddToCart, onReorder: handleReorder })
          : children}
      </main>

      <Footer />

      <Cart
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cartItems={cartItems}
        onOrderComplete={handleOrderComplete}
      />

      <OrderConfirmation
        order={orderComplete}
        onClose={handleCloseConfirmation}
      />

      <TrackOrderModal
        isOpen={isTrackOpen}
        onClose={() => setIsTrackOpen(false)}
      />

      <OrderTracker />
    </div>
  )
}
