// MenuCard - displays a single menu item with SVG icon, name, description, price, and add to cart button

import BurgerIcon from './icons/BurgerIcon'
import FriesIcon from './icons/FriesIcon'
import DrinkIcon from './icons/DrinkIcon'
import DessertIcon from './icons/DessertIcon'
import ChickenIcon from './icons/ChickenIcon'

// Map category names to their corresponding icons
const ICONS = {
  Burgers: BurgerIcon,
  Sides: FriesIcon,
  Drinks: DrinkIcon,
  Desserts: DessertIcon,
  // For any chicken-tagged item
  Chicken: ChickenIcon,
}

export default function MenuCard({ item, onAddToCart }) {
  // Choose icon based on category, fallback to chicken for spicy items
  let Icon = ICONS[item.category] || ChickenIcon
  if (item.tags && item.tags.includes('signature') && item.category === 'Burgers') {
    Icon = BurgerIcon
  }

  // Tag color mapping - all tags use glass pills now, the icon differentiates
  // them visually (the red burger icon for spicy, etc).
  const tagStyles = {
    signature: 'bg-brand-yellow/20 text-brand-yellow border border-brand-yellow/40',
    vegetarian: 'bg-white/10 text-white/80 border border-white/15 backdrop-blur',
    spicy: 'bg-white/10 text-white/80 border border-white/15 backdrop-blur',
  }

  return (
    <article className="glass text-brand-white p-6 flex flex-col h-full rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:ring-1 hover:ring-brand-yellow/40">
      {/* Icon - sits on a soft yellow radial so it glows against the glass */}
      <div
        className="mb-4 flex items-center justify-center h-20 rounded-xl"
        style={{
          background:
            'radial-gradient(circle, rgba(255, 212, 0, 0.15), transparent 70%)',
        }}
      >
        <Icon className="w-20 h-20" />
      </div>

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full backdrop-blur ${
                tagStyles[tag] ||
                'bg-white/10 text-white/80 border border-white/15 backdrop-blur'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Name */}
      <h3 className="font-display text-xl mb-2 leading-tight text-brand-white">
        {item.name}
      </h3>

      {/* Description */}
      <p className="text-sm text-white/70 mb-4 flex-grow font-body">
        {item.description}
      </p>

      {/* Price + Add button - the row needs `gap-3` so the price and
          the button don't squish on narrow phones; on `sm+` the gap
          widens slightly. The button text shrinks to "ADD" on phones
          (under `sm`) to keep the row from wrapping on the smallest
          devices. */}
      <div className="flex items-center justify-between gap-3 mt-auto">
        <span className="font-display text-xl sm:text-2xl text-brand-yellow shrink-0">
          ${item.price.toFixed(2)}
        </span>
        <button
          onClick={() => onAddToCart(item)}
          className="bg-brand-yellow text-brand-black font-bold text-xs sm:text-sm px-3 sm:px-4 py-2 rounded-full hover:bg-brand-yellow-warm transition-all shadow-lg shadow-brand-yellow/20 active:scale-95"
          aria-label={`Add ${item.name} to cart`}
        >
          <span className="sm:hidden">ADD</span>
          <span className="hidden sm:inline">ADD TO CART</span>
        </button>
      </div>
    </article>
  )
}