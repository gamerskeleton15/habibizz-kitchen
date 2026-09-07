// Home - the customer landing page at /.
// Slimmed down to: Hero + a small "Featured" grid of 3 hand-picked items
// + a "View full menu" button. The full menu now lives at /menu.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PageLayout from './PageLayout'
import Hero from './Hero'
import MenuCard from './MenuCard'

// Hard-coded featured items (by id from menu.json). The 3 signature picks.
const FEATURED_IDS = [1, 5, 9]

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await fetch(api('/api/menu'))
        if (!res.ok) throw new Error('Failed to load menu')
        const all = await res.json()
        // Preserve the order of FEATURED_IDS
        const picked = FEATURED_IDS
          .map((id) => all.find((i) => i.id === id))
          .filter(Boolean)
        setFeatured(picked)
        setLoading(false)
      } catch (err) {
        console.error('Failed to load featured items:', err)
        setLoading(false)
      }
    }
    fetchFeatured()
  }, [])

  return (
    <PageLayout>
      {({ onAddToCart }) => (
        <>
          <Hero />
          <section
            className="bg-transparent text-brand-white py-16 sm:py-20 relative"
            aria-label="Featured items"
          >
            {/* Soft yellow radial behind the section for emphasis.
                The radial is pushed down (30% from top, not 0%) and the
                gradient starts at 0% opacity and fades in over the first
                15% of the section. That kills the hard horizontal line
                that used to appear where the Hero above meets this
                section — before this, the radial's top edge sat right
                on the section boundary, so it read as a visible partition. */}
            <div
              className="absolute inset-0 pointer-events-none"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(ellipse 80% 55% at 50% 30%, rgba(255, 212, 0, 0.10) 0%, rgba(255, 212, 0, 0.06) 40%, transparent 75%)',
              }}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="text-center mb-10">
                <h2 className="font-display text-4xl sm:text-5xl mb-4 text-brand-white">
                  TODAY'S{' '}
                  <span className="text-brand-yellow drop-shadow-md">
                    PICKS
                  </span>
                </h2>
                <p className="text-white/70 max-w-xl mx-auto font-body">
                  A few of our favorites. The full kitchen is one click away.
                </p>
              </div>

              {loading ? (
                <div className="text-center py-12 text-white/60">Loading...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featured.map((item) => (
                    <MenuCard
                      key={item.id}
                      item={item}
                      onAddToCart={onAddToCart}
                    />
                  ))}
                </div>
              )}

              <div className="text-center mt-12">
                <Link
                  to="/menu"
                  className="inline-block bg-brand-yellow text-brand-black font-display text-lg uppercase tracking-wider px-10 py-4 rounded-full hover:bg-brand-yellow-warm shadow-xl shadow-brand-yellow/30 hover:shadow-2xl hover:shadow-brand-yellow/40 transition-all duration-300 hover:-translate-y-1 active:translate-y-0"
                >
                  VIEW FULL MENU
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </PageLayout>
  )
}
