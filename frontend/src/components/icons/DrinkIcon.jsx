// Custom SVG icon: Drink cup with straw

export default function DrinkIcon({ className = "w-16 h-16" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Lid */}
      <rect x="14" y="10" width="36" height="6" rx="1" fill="#0D0D0D"/>
      {/* Straw */}
      <rect x="34" y="2" width="4" height="16" fill="#0D0D0D"/>
      {/* Cup body */}
      <path d="M16 16L48 16L44 56L20 56L16 16Z" fill="#FFFFFF" stroke="#0D0D0D" strokeWidth="2.5"/>
      {/* Cup stripe */}
      <rect x="20" y="28" width="24" height="3" fill="#FFD400"/>
      <rect x="21" y="34" width="22" height="3" fill="#FFD400"/>
      {/* Bubble */}
      <circle cx="26" cy="44" r="1.5" fill="#0D0D0D"/>
      <circle cx="36" cy="48" r="1.5" fill="#0D0D0D"/>
      <circle cx="30" cy="50" r="1.5" fill="#0D0D0D"/>
    </svg>
  )
}