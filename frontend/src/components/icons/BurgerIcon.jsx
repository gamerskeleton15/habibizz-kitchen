// Custom SVG icon: Burger
// Black outline with yellow fill, flat style

export default function BurgerIcon({ className = "w-16 h-16" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Top bun */}
      <path d="M8 26C8 16 18 8 32 8C46 8 56 16 56 26H8Z" fill="#FFD400" stroke="#0D0D0D" strokeWidth="2.5"/>
      {/* Seeds on top bun */}
      <ellipse cx="22" cy="18" rx="2" ry="1.5" fill="#0D0D0D"/>
      <ellipse cx="32" cy="14" rx="2" ry="1.5" fill="#0D0D0D"/>
      <ellipse cx="42" cy="18" rx="2" ry="1.5" fill="#0D0D0D"/>
      {/* Lettuce */}
      <path d="M6 30H58L55 36H9L6 30Z" fill="#FFFFFF" stroke="#0D0D0D" strokeWidth="2"/>
      {/* Cheese */}
      <path d="M8 36H56L52 42H12L8 36Z" fill="#FFD400" stroke="#0D0D0D" strokeWidth="2"/>
      {/* Patty */}
      <rect x="8" y="42" width="48" height="8" rx="1" fill="#0D0D0D"/>
      {/* Bottom bun */}
      <path d="M10 50H54L50 56H14L10 50Z" fill="#FFD400" stroke="#0D0D0D" strokeWidth="2.5"/>
    </svg>
  )
}