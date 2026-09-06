// Custom SVG icon: Dessert (cake slice)

export default function DessertIcon({ className = "w-16 h-16" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cherry on top */}
      <circle cx="32" cy="10" r="4" fill="#0D0D0D"/>
      <path d="M32 6C32 4 34 2 36 4" stroke="#0D0D0D" strokeWidth="1.5" fill="none"/>
      {/* Whipped cream */}
      <path d="M22 16C22 12 28 10 32 12C36 10 42 12 42 16H22Z" fill="#FFFFFF" stroke="#0D0D0D" strokeWidth="2"/>
      {/* Cake slice top */}
      <path d="M18 16L46 16L42 26L22 26L18 16Z" fill="#FFD400" stroke="#0D0D0D" strokeWidth="2.5"/>
      {/* Cake slice body */}
      <path d="M22 26L42 26L48 50L16 50L22 26Z" fill="#FFFFFF" stroke="#0D0D0D" strokeWidth="2.5"/>
      {/* Cake layers */}
      <line x1="20" y1="34" x2="44" y2="34" stroke="#0D0D0D" strokeWidth="1.5"/>
      <line x1="18" y1="42" x2="46" y2="42" stroke="#0D0D0D" strokeWidth="1.5"/>
      {/* Drip on side */}
      <path d="M18 28C18 32 20 32 20 30" fill="#FFD400" stroke="#0D0D0D" strokeWidth="1.5"/>
    </svg>
  )
}