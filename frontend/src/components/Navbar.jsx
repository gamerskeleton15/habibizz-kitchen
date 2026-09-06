// Navbar component - sticky, black background, with logo, track button, and cart icon.
// On mobile (<md) the inline links are hidden behind a hamburger that slides in
// a side drawer from the left. On md+ the original horizontal nav is shown.
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import CartIcon from './icons/CartIcon'
import Logo from './Logo'
import { useAuth } from '../auth/AuthProvider'

// Helper: classes for an active vs inactive nav link. NavLink applies the
// "active" class when the route matches, so the current page is highlighted.
// Each link is a rounded-full glass pill. Inactive: subtle white glass that
// becomes more visible on hover. Active: yellow glass with black text. The
// "after:" pseudo-element draws the inner color fill that grows on hover,
// so the transition reads as a pill "filling" rather than a color swap.
const navLinkClass = ({ isActive }) =>
  `relative font-display text-sm uppercase tracking-wider px-4 py-2 rounded-full transition-all duration-300 overflow-hidden ${
    isActive
      ? 'glass-yellow text-brand-black shadow-lg shadow-brand-yellow/20'
      : 'text-white/80 hover:text-brand-white'
  }
   ${
     isActive
       ? ''
       : 'after:absolute after:inset-0 after:rounded-full after:bg-white/10 after:backdrop-blur-md after:-z-10 after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-300 after:border after:border-white/10'
   }`

// Same active-state styling as the desktop pills, but tuned for the side
// drawer: left-aligned, larger tap target, no rounded pill (full-width row).
const drawerLinkClass = ({ isActive }) =>
  `flex items-center gap-3 w-full text-left font-display text-base uppercase tracking-wider px-4 py-3 rounded-xl transition-all duration-200 ${
    isActive
      ? 'bg-brand-yellow text-brand-black shadow-lg shadow-brand-yellow/20'
      : 'text-white/90 hover:bg-white/10'
  }`

// Single source of truth for the mobile drawer items so we never drift
// between what's shown on desktop and what's shown on mobile.
const NAV_ITEMS = [
  { to: '/menu', label: 'Menu' },
  { to: '/portfolio', label: 'Gallery' },
  { to: '/orders', label: 'Orders' },
  { to: '/about', label: 'About' },
  { to: '/support', label: 'Support' },
  { to: '/contact', label: 'Contact' },
]

export default function Navbar({ cartCount, onCartClick, onTrackClick }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const accountMenuRef = useRef(null)
  const { user, logout, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Auto-close the drawer whenever the route changes. Without this, tapping
  // a link would leave the drawer open over the new page.
  useEffect(() => {
    setIsDrawerOpen(false)
  }, [location.pathname])

  // Handle scroll position when drawer opens/closes
  useEffect(() => {
    if (isDrawerOpen) {
      // Save current scroll position and scroll to top
      setScrollPosition(window.pageYOffset || document.documentElement.scrollTop)
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    } else {
      // Restore previous scroll position
      window.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      })
    }
  }, [isDrawerOpen])

  // Lock body scroll while the drawer is open so the page underneath
  // doesn't scroll when the user swipes. Restored on close.
  useEffect(() => {
    if (!isDrawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isDrawerOpen])

  // Close on Escape for keyboard / Android-back-button users.
  useEffect(() => {
    if (!isDrawerOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setIsDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDrawerOpen])

  // Close the account dropdown on outside click or Escape.
  useEffect(() => {
    if (!isAccountMenuOpen) return
    const onClick = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setIsAccountMenuOpen(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setIsAccountMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [isAccountMenuOpen])

  return (
    <>
      <nav
        className="sticky top-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/10"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 gap-2">
            {/* Mobile hamburger - compact icon button on the far left
                of the sticky top bar. Because the <nav> itself is
                `sticky top-0`, the hamburger stays visible at the
                top of the viewport as the user scrolls - it's part
                of the navbar's normal flow rather than a separate
                floating element, so it can't get hidden behind or
                pushed off by anything else. Hidden on md+ where
                the inline nav links take over. */}
            <button
              onClick={() => setIsDrawerOpen((v) => !v)}
              className="md:hidden p-1.5 -ml-1 text-brand-white hover:text-brand-yellow transition-colors rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
              aria-label={isDrawerOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isDrawerOpen}
              aria-controls="mobile-nav-drawer"
            >
              <div className="w-5 h-4 relative flex flex-col justify-between">
                <span
                  className={`block h-0.5 w-5 bg-current rounded-full transition-all duration-300 origin-center ${
                    isDrawerOpen ? 'translate-y-1.5 rotate-45' : ''
                  }`}
                />
                <span
                  className={`block h-0.5 w-5 bg-current rounded-full transition-all duration-300 ${
                    isDrawerOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`block h-0.5 w-5 bg-current rounded-full transition-all duration-300 origin-center ${
                    isDrawerOpen ? '-translate-y-1.5 -rotate-45' : ''
                  }`}
                />
              </div>
            </button>

            {/* Logo / Wordmark - compact on mobile (just the round badge,
                no HABIBIZZ text label so it fits in 56px). On sm+ the
                full wordmark returns. */}
            <Link
              to="/"
              className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="Habibizz Kitchens home"
            >
              <Logo size={36} />
              <span className="hidden sm:inline-block font-display text-lg uppercase tracking-tight bg-brand-yellow text-brand-black px-2.5 py-1 -rotate-2 shadow-lg shadow-brand-yellow/30 transition-transform duration-300 hover:rotate-0 hover:bg-brand-yellow-warm leading-none">
                HABIBIZZ
              </span>
            </Link>

            {/* Nav links - hidden below md; the side drawer takes over. */}
            <div className="hidden md:flex items-center gap-2">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </div>

            {/* Right-side actions: Track + Cart + Hidden Admin - compact on mobile. */}
            <div className="flex items-center gap-1.5 sm:gap-3 ml-auto">
              {/* Track order - on mobile, just a small pill button
                  to save horizontal space. On sm+ the full label
                  returns. */}
              <button
                onClick={onTrackClick}
                className="bg-brand-yellow text-brand-black font-display text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full hover:bg-brand-yellow-warm shadow-lg shadow-brand-yellow/30 transition-all duration-300"
                aria-label="Track an existing order"
              >
                TRACK ORDER
              </button>

              {/* Hidden admin button - accessible via long press or specific sequence */}
              <button
                onClick={() => window.location.href = '/admin'}
                className="hidden md:inline-flex items-center gap-1 px-2 py-1 text-xs font-display uppercase tracking-wider bg-brand-yellow/20 hover:bg-brand-yellow/30 rounded-full transition-all duration-200"
                aria-label="Admin panel"
              >
                ADMIN
              </button>

              {/* Cart button with badge - smaller icon on mobile */}
              <button
                onClick={onCartClick}
                className="relative p-1.5 sm:p-2 text-brand-white hover:text-brand-yellow transition-colors"
                aria-label={`Open cart with ${cartCount} item${cartCount !== 1 ? 's' : ''}`}
              >
                <CartIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 bg-brand-yellow text-brand-black font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    {cartCount}
                  </span>
                )}
              </button>

              {/* Sign in / Account menu - a small circular account button
                  (the person silhouette that reads as an "eaten donut")
                  placed after the cart. Logged out it's a hollow user icon;
                  logged in it shows the user's avatar. Clicking opens a
                  dropdown with Google + GitHub (logged out) or the user's
                  info + logout (logged in). */}
              <div className="relative" ref={accountMenuRef}>
                {loading ? (
                  // While /auth/me is in flight, render an invisible
                  // placeholder so the layout doesn't jump when the real
                  // button appears.
                  <span className="inline-block w-9 h-9" aria-hidden="true" />
                ) : user ? (
                  <>
                    <button
                      onClick={() => setIsAccountMenuOpen((v) => !v)}
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 overflow-hidden transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
                      aria-haspopup="menu"
                      aria-expanded={isAccountMenuOpen}
                      aria-label="Account menu"
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="w-full h-full rounded-full bg-brand-yellow text-brand-black font-display text-sm flex items-center justify-center">
                          {(user.name || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </button>

                    {isAccountMenuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 mt-2 w-56 rounded-2xl bg-brand-black/95 border border-white/10 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden z-[70] animate-[fadeIn_0.15s_ease-out]"
                      >
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-sm font-display text-white truncate">
                            {user.name}
                          </p>
                          {user.email && (
                            <p className="text-xs text-white/50 truncate">
                              {user.email}
                            </p>
                          )}
                          <p className="text-[10px] uppercase tracking-wider text-brand-yellow mt-1">
                            via {user.provider}
                          </p>
                        </div>
                        <button
                          role="menuitem"
                          onClick={async () => {
                            setIsAccountMenuOpen(false)
                            await logout()
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-white/90 hover:bg-white/10 transition-colors flex items-center gap-2"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                          </svg>
                          Log out
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white/90 hover:text-brand-yellow transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
                    aria-label="Sign in"
                  >
                    {/* Person silhouette - reads as an "eaten donut":
                        a head + shoulders with the center hollowed out. */}
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      </nav>

      {/* ---- Mobile side drawer ----
          Rendered outside the <nav> so it can use the full viewport for
          its slide-in transform. The backdrop fades in, the panel slides
          from the left. Both are unmounted when closed so backdrop-filter
          isn't running off-screen. */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-[50]" id="mobile-nav-drawer">
          {/* Backdrop - click to close */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
          />

          {/* Drawer panel */}
          <aside
            className="fixed top-0 left-0 h-[100vh] w-[80%] max-w-[320px] bg-brand-black border-r border-white/10 shadow-2xl flex flex-col animate-[slideInLeft_0.25s_ease-out] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            {/* Drawer header - logo + close button. Mirrors the top bar
                so the user has a familiar anchor when they slide it open. */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 shrink-0">
              <Link
                to="/"
                className="flex items-center gap-2.5"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Habibizz Kitchens home"
              >
                <Logo size={36} />
                <span className="font-display text-base uppercase tracking-tight bg-brand-yellow text-brand-black px-2 py-0.5 -rotate-2 leading-none">
                  HABIBIZZ
                </span>
              </Link>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 text-white/80 hover:text-brand-yellow rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow"
                aria-label="Close menu"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M6 6 L18 18 M18 6 L6 18" />
                </svg>
              </button>
            </div>

            {/* Scrollable link list. Each link closes the drawer on click
                (handled by the location effect above) so the new page
                isn't covered. */}
            <nav className="flex-1 p-3 space-y-1" aria-label="Mobile menu">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={drawerLinkClass}>
                    <span>{item.label}</span>
                    <svg
                      className="ml-auto opacity-60"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 6 L15 12 L9 18" />
                    </svg>
                  </NavLink>
                </li>
              ))}
            </nav>

            {/* Drawer footer - small branding line so the panel doesn't
                feel empty at the bottom. */}
            <div className="px-4 py-4 border-t border-white/10 text-xs text-white/50 shrink-0">
              Bold fast food, made fresh.
            </div>

            {/* Hidden admin button in mobile drawer - accessible via long press or specific sequence */}
            <div className="px-4 py-2 text-center">
              <button
                onClick={() => window.location.href = '/admin'}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-display uppercase tracking-wider bg-brand-yellow/20 hover:bg-brand-yellow/30 rounded-full transition-all duration-200"
                aria-label="Admin panel"
              >
                ADMIN
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Keyframes for the drawer backdrop + panel. Defined inline as a
          <style> tag so we don't need to touch the global CSS file. The
          `prefers-reduced-motion` rule in index.css zeroes these out for
          motion-sensitive users automatically. */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
