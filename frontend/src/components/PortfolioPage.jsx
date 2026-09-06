// PortfolioPage - /portfolio route. Photo gallery of dishes.
// Uses logo.png as a placeholder image until real photos are added.

import { useEffect } from 'react'
import { Link } from 'react-router-dom'

// Fallback gallery items shown when the menu API isn't available or returns
// nothing - keeps the page from looking empty on first load.
const FALLBACK_ITEMS = [
  { id: 'f1', name: 'Big Habibizz Burger', category: 'Burgers' },
  { id: 'f2', name: 'Chicken Royale Burger', category: 'Burgers' },
  { id: 'f3', name: 'Veggie Deluxe Burger', category: 'Burgers' },
  { id: 'f4', name: 'Crispy Fries', category: 'Sides' },
  { id: 'f5', name: 'Loaded Fries', category: 'Sides' },
  { id: 'f6', name: 'Onion Rings', category: 'Sides' },
  { id: 'f7', name: 'Habibizz Cola', category: 'Drinks' },
  { id: 'f8', name: 'Mango Lassi', category: 'Drinks' },
  { id: 'f9', name: 'Chocolate Fudge Cake', category: 'Desserts' },
  { id: 'f10', name: 'Apple Pie', category: 'Desserts' },
]

// Map category -> gradient for the placeholder card. Kept brand-consistent.
const CATEGORY_BG = {
  Burgers: 'from-yellow-500 to-orange-500',
  Sides: 'from-yellow-400 to-amber-600',
  Drinks: 'from-blue-500 to-cyan-500',
  Desserts: 'from-pink-500 to-rose-500',
}

export default function PortfolioPage() {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  return (
    <div className="bg-brand-offwhite text-brand-black">
      {/* Banner - dark with a soft yellow radial behind the H1.
          No hard border-b-4: the original thick yellow line read as a
          visible "partition" between the dark hero and the white card
          below. A soft radial glow at the bottom fades black->yellow->black
          so the join feels like a smooth transition instead of a cut. */}
      <section className="relative bg-brand-black text-brand-white py-20 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255, 212, 0, 0.18), transparent 70%)',
          }}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="font-display text-5xl sm:text-6xl mb-4">
            THE <span className="text-brand-yellow">GALLERY</span>
          </h1>
          <p className="text-lg text-brand-white/80 font-body max-w-2xl mx-auto">
            A taste of what we put out. Every dish, made fresh.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FALLBACK_ITEMS.map((item) => {
              const bg = CATEGORY_BG[item.category] || 'from-gray-400 to-gray-600'
              return (
                <article
                  key={item.id}
                  className="bg-brand-white overflow-hidden group"
                >
                  {/* Image area - logo placeholder over a category-tinted gradient.
                      When real photos are added, swap this <div> for an <img>. */}
                  <div
                    className={`relative aspect-square bg-gradient-to-br ${bg} flex items-center justify-center`}
                  >
                    <img
                      src="/logo.png"
                      alt={`${item.name} placeholder`}
                      className="w-1/2 h-1/2 object-contain opacity-90 group-hover:scale-105 transition-transform"
                    />
                    {/* Category badge */}
                    <span className="absolute top-3 left-3 bg-brand-black text-brand-yellow text-xs font-bold uppercase px-2 py-1">
                      {item.category}
                    </span>
                  </div>
                  {/* Caption */}
                  <div className="p-4">
                    <h2 className="font-display text-lg">{item.name}</h2>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/menu"
              className="inline-block bg-brand-yellow text-brand-black font-display text-lg uppercase tracking-wider px-10 py-4 rounded-full hover:bg-brand-yellow-warm shadow-xl shadow-brand-yellow/30 hover:shadow-2xl hover:shadow-brand-yellow/40 transition-all duration-300 hover:-translate-y-1 active:translate-y-0"
            >
              SEE THE FULL MENU
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
