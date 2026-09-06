// Custom SVG icon: Fries
// Red/yellow box with yellow fries sticking out

export default function FriesIcon({ className = "w-16 h-16" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Fries sticks */}
      <rect x="20" y="6" width="4" height="32" fill="#FFD400" stroke="#0D0D0D" strokeWidth="2"/>
      <rect x="26" y="4" width="4" height="34" fill="#FFD400" stroke="#0D0D0D" strokeWidth="2"/>
      <rect x="32" y="2" width="4" height="36" fill="#FFD400" stroke="#0D0D0D" strokeWidth="2"/>
      <rect x="38" y="4" width="4" height="34" fill="#FFD400" stroke="#0D0D0D" strokeWidth="2"/>
      <rect x="44" y="6" width="4" height="32" fill="#FFD400" stroke="#0D0D0D" strokeWidth="2"/>
      {/* Box top */}
      <path d="M14 24L50 24L54 32L10 32L14 24Z" fill="#FFD400" stroke="#0D0D0D" strokeWidth="2.5"/>
      {/* Box body */}
      <path d="M10 32L54 32L50 56L14 56L10 32Z" fill="#FFD400" stroke="#0D0D0D" strokeWidth="2.5"/>
      {/* Box stripes */}
      <rect x="22" y="36" width="2" height="14" fill="#0D0D0D"/>
      <rect x="31" y="36" width="2" height="14" fill="#0D0D0D"/>
      <rect x="40" y="36" width="2" height="14" fill="#0D0D0D"/>
    </svg>
  )
}