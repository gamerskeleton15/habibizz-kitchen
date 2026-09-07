// MenuPage - the full /menu route.
// Same fetch + category logic as the in-home <Menu />, but lives on its own
// page so the home page can be slimmed down to "Hero + Featured".

import { useState, useEffect } from 'react'
import MenuCard from './MenuCard'
import api from '../apiClient'

const CATEGORIES = ['Burgers', 'Sides', 'Drinks', 'Desserts']

export default function MenuPage({ onAddToCart }) {
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(api('/api/menu'))
        if (!response.ok) throw new Error('Failed to load menu')
        const data = await response.json()
        setMenuItems(data)
        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }
    fetchMenu()
  }, [])

  // Scroll to top when the page mounts (otherwise we land mid-page on link click)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  const itemsByCategory = CATEGORIES.reduce((acc, category) => {
    acc[category] = menuItems.filter((item) => item.category === category)
    return acc
  }, {})

  return (
    <section
      className="bg-transparent text-brand-white py-16 sm:py-20"
      aria-label="Full menu"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl sm:text-5xl mb-4 text-brand-white">
            THE{' '}
            <span className="text-brand-yellow bg-gradient-to-r from-brand-yellow to-yellow-300 bg-clip-text text-transparent drop-shadow-md">
              MENU
            </span>
          </h1>
          <p className="text-white/70 max-w-xl mx-auto font-body">
            Pick your poison. Every item is made fresh, fast, and with attitude.
          </p>
        </div>

        {/* Category filter buttons - glass pills (active = yellow glass) */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-5 py-2 font-bold text-sm rounded-full transition-all backdrop-blur ${
              activeCategory === 'All'
                ? 'glass-yellow text-brand-black'
                : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10'
            }`}
          >
            ALL
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-2 font-bold text-sm rounded-full transition-all backdrop-blur ${
                activeCategory === category
                  ? 'glass-yellow text-brand-black'
                  : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/10'
              }`}
            >
              {category.toUpperCase()}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-white/60">Loading menu...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-red-400">
              Could not load menu. Make sure the backend is running on port 4000.
            </p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-16">
            {CATEGORIES.filter(
              (cat) => activeCategory === 'All' || activeCategory === cat
            ).map(
              (category) =>
                itemsByCategory[category].length > 0 && (
                  <div key={category}>
                    <h2 className="font-display text-2xl sm:text-3xl mb-6 inline-block text-brand-white">
                      {category}
                      <span
                        className="block h-1 mt-1 bg-gradient-to-r from-brand-yellow to-transparent"
                        aria-hidden="true"
                      />
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                      {itemsByCategory[category].map((item) => (
                        <MenuCard
                          key={item.id}
                          item={item}
                          onAddToCart={onAddToCart}
                        />
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>
        )}
      </div>
    </section>
  )
}
