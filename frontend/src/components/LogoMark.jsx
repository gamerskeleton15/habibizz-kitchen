// Simplified flat version of the Habibizz Kitchens logo.
// Just the gold ring + black fill + chef hat. No text, no flourishes.
// Used for the favicon and anywhere the full logo would be too small to read.
//
// Props:
//   size  - pixel size (width & height). Default 32.
//   className - additional classes.
export default function LogoMark({ size = 32, className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label="Habibizz Kitchens"
      className={className}
    >
      {/* Outer gold ring (double-lined) */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="#FFD400" strokeWidth="3" />
      <circle cx="50" cy="50" r="44" fill="none" stroke="#FFD400" strokeWidth="3" />

      {/* Solid black fill */}
      <circle cx="50" cy="50" r="41" fill="#0D0D0D" />

      {/* Chef hat - same artwork as the full logo, scaled up to fill the mark */}
      <g
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M32 56
                 C26 56 23 51 23 45
                 C23 39 27 35 32 36
                 C32 30 38 26 50 26
                 C62 26 68 30 68 36
                 C73 35 77 39 77 45
                 C77 51 74 56 68 56
                 Z" />
        <rect x="32" y="56" width="36" height="9" rx="1.5" />
        <line x1="42" y1="58" x2="42" y2="63" />
        <line x1="50" y1="58" x2="50" y2="63" />
        <line x1="58" y1="58" x2="58" y2="63" />
      </g>
    </svg>
  )
}
