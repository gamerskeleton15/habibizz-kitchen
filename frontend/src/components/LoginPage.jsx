// LoginPage - the dedicated sign-in page at /login.
//
// Matches the site theme exactly (brand black + brand yellow, the same
// display font and pill buttons used everywhere else). A customer lands
// here when they try to add to cart / reorder / check out while logged
// out, or by clicking the account circle in the navbar.
//
// Sign-in is done by the backend's OAuth (Google + GitHub) - there is no
// email/password flow for customers. Clicking a provider bounces the
// browser to /auth/<provider>, through the provider, and back to the site
// with a session cookie set. AuthProvider then redirects the user to the
// page they were originally heading for.

import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import Logo from './Logo'
import SmokeyBackground from './SmokeyBackground'

export default function LoginPage() {
  const { user, loading, loginWith } = useAuth()

  // After the OAuth redirect returns, `user` is set and we show a brief
  // success card instead of the sign-in buttons (AuthProvider navigates
  // them onward if they were mid-action, e.g. adding to cart).
  if (!loading && user) {
    return (
      <section className="min-h-[65vh] flex items-center justify-center px-4 py-20 relative">
        {/* Live smoke background - gentle brand-yellow plumes drifting
            behind the card. Falls back to a static glow without WebGL. */}
        <SmokeyBackground color="#FFD400" intensity={0.4} aria-hidden="true" />
        <div className="relative z-10 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <Logo size={64} />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-brand-white mb-3">
            YOU'RE{' '}
            <span className="text-brand-yellow drop-shadow-md">SIGNED IN</span>
          </h1>
          <p className="text-white/70 font-body mb-8">
            {user.name ? `Welcome back, ${user.name}!` : 'Welcome back!'} Add your
            favorite items to the cart and check out.
          </p>
          <Link
            to="/menu"
            className="inline-block bg-brand-yellow text-brand-black font-display text-lg uppercase tracking-wider px-8 py-3 rounded-full hover:bg-brand-yellow-warm shadow-lg shadow-brand-yellow/30 transition-all duration-300 hover:-translate-y-0.5"
          >
            BROWSE THE MENU
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-[65vh] flex items-center justify-center px-4 py-20 relative">
      {/* Live smoke background - gentle brand-yellow plumes drifting
          behind the card. Falls back to a static glow without WebGL. */}
      <SmokeyBackground color="#FFD400" intensity={0.4} aria-hidden="true" />
      <div className="relative z-10 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size={56} />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-brand-white mb-3">
            SIGN IN{' '}
            <span className="text-brand-yellow drop-shadow-md">TO ORDER</span>
          </h1>
          <p className="text-white/70 font-body">
            Browse the menu freely — just sign in when you're ready to add
            to cart and check out.
          </p>
        </div>

        {/* Provider buttons - glass panel, same styling language as the
            rest of the site. */}
        <div className="glass rounded-2xl p-3 space-y-2 border border-white/10 shadow-2xl shadow-black/40">
          <button
            type="button"
            onClick={() => loginWith('google')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-brand-black hover:bg-white/90 transition-colors text-sm font-medium"
          >
            {/* Google "G" mark - the official multicolor glyph. */}
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.78-.07-1.53-.2-2.27H12v4.51h6.47c-.28 1.4-1.07 2.59-2.27 3.4v2.85h3.66c2.16-1.99 3.43-4.91 3.43-8.49z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.15 0 5.79-1.05 7.72-2.84l-3.66-2.85c-1.02.68-2.31 1.09-4.06 1.09-3.13 0-5.78-2.11-6.73-4.96H1.46v3.11A11.99 11.99 0 0 0 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.36c-.24-.68-.38-1.41-.38-2.16s.14-1.48.38-2.16V6.93H1.46A11.99 11.99 0 0 0 .27 12c0 1.94.47 3.77 1.19 5.07l3.81-2.71z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.21-3.21C17.79 1.18 15.13 0 12 0 7.31 0 3.26 2.69 1.46 6.93l3.81 3.11C6.22 6.86 8.87 4.75 12 4.75z"
              />
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => loginWith('github')}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-brand-black text-white border border-white/15 hover:bg-white/10 transition-colors text-sm font-medium"
          >
            {/* GitHub mark - the simple "Mark" silhouette. */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-1.95c-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.54-2.55-.29-5.23-1.27-5.23-5.66 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18.91-.25 1.89-.38 2.86-.38.97 0 1.95.13 2.86.38 2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.23 2.76.11 3.05.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.37-5.25 5.65.41.36.78 1.05.78 2.12v3.14c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
            </svg>
            Continue with GitHub
          </button>
        </div>

        <p className="text-center text-xs text-white/50 mt-6 font-body">
          Guests can look at the menu, but you'll need to sign in to add
          items to your cart and place an order.
        </p>
      </div>
    </section>
  )
}
