// Custom SVG icon: Chicken (drumstick)

export default function ChickenIcon({ className = "w-16 h-16" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Drumstick meat */}
      <ellipse cx="20" cy="44" rx="14" ry="10" fill="#FFD400" stroke="#0D0D0D" strokeWidth="2.5"/>
      {/* Bone */}
      <rect x="34" y="20" width="14" height="6" fill="#FFFFFF" stroke="#0D0D0D" strokeWidth="2.5" transform="rotate(-45 34 20)"/>
      <circle cx="48" cy="14" r="4" fill="#FFFFFF" stroke="#0D0D0D" strokeWidth="2.5"/>
      <circle cx="52" cy="20" r="3" fill="#FFFFFF" stroke="#0D0D0D" strokeWidth="2"/>
      {/* Texture lines */}
      <path d="M14 42C16 40 18 40 20 42" stroke="#0D0D0D" strokeWidth="1.5" fill="none"/>
      <path d="M22 46C24 48 26 48 28 46" stroke="#0D0D0D" strokeWidth="1.5" fill="none"/>
    </svg>
  )
}