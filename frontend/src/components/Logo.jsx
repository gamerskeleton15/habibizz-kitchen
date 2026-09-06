// Habibizz Kitchens circular badge logo
// A reusable React SVG component. Uses <textPath> along a circular <path>
// so the "HABIBI'ZZZ" wordmark arches along the upper inside of the badge.
//
// Props:
//   size  - pixel size (width & height). Default 64.
//   title - accessible <title> for screen readers.
//   className - additional classes to apply to the wrapper.
export default function Logo({ size = 64, title = 'Habibizz Kitchens', className = '' }) {
  // Viewbox is 100x100 so all the path math below is in % units.
  return (
    <svg
      xmlns="http://www.w3.org/w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-labelledby="logo-title"
      className={className}
    >
      <title id="logo-title">{title}</title>

      {/* Defs: paths used by <textPath> for the arched text.
          Both are circles defined by radius + offset so the text sits
          cleanly along the upper arc, with a small gap to the chef hat. */}
      <defs>
        {/* Circle used as the text path. startOffset centers the text. */}
        <path
          id="hk-arch-path"
          d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0"
        />
      </defs>

      {/* Outer gold ring (double-lined like a coin edge) */}
      <circle cx="50" cy="50" r="48" fill="none" stroke="#FFD400" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#FFD400" strokeWidth="2.5" />

      {/* Solid black fill inside the ring */}
      <circle cx="50" cy="50" r="42" fill="#0D0D0D" />

      {/* Decorative sparkle dots near the top, flanking the chef hat */}
      <g fill="#FFD400" aria-hidden="true">
        <circle cx="30" cy="28" r="1.2" />
        <circle cx="70" cy="28" r="1.2" />
      </g>

      {/* Chef hat icon - line art, centered near the top of the circle */}
      <g
        stroke="#FFFFFF"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        aria-hidden="true"
      >
        {/* Hat body (the puffy top) */}
        <path d="M40 38
                 C36 38 34 35 34 31
                 C34 27 37 25 40 26
                 C40 22 44 20 50 20
                 C56 20 60 22 60 26
                 C63 25 66 27 66 31
                 C66 35 64 38 60 38
                 Z" />
        {/* Hat band (the rectangular bottom of the chef hat) */}
        <rect x="40" y="38" width="20" height="5" rx="1" />
        {/* Small pleat lines on the band for detail */}
        <line x1="46" y1="39.5" x2="46" y2="41.5" />
        <line x1="50" y1="39.5" x2="50" y2="41.5" />
        <line x1="54" y1="39.5" x2="54" y2="41.5" />
      </g>

      {/* Arched "HABIBI'ZZZ" wordmark along the upper inside of the ring */}
      <text
        fill="#FFD400"
        fontFamily='"Archivo Black", "Arial Black", sans-serif'
        fontWeight="900"
        fontSize="13"
        letterSpacing="1.2"
        textAnchor="middle"
      >
        <textPath href="#hk-arch-path" startOffset="25%">
          HABIBI&apos;ZZZ
        </textPath>
      </text>

      {/* "KITCHEN" - smaller, letter-spaced, centered below the arch */}
      <text
        x="50"
        y="68"
        fill="#FFFFFF"
        fontFamily='"Archivo Black", "Arial Black", sans-serif'
        fontWeight="900"
        fontSize="7"
        letterSpacing="2.5"
        textAnchor="middle"
      >
        KITCHEN
      </text>

      {/* Crossed-utensil flourish flanking the text, orange/gold.
          Two small "spark/star" marks on each side of the wordmark, in the
          stamp/badge style. Drawn as 4-pointed star shapes. */}
      <g fill="#FFD400" aria-hidden="true">
        {/* Left star */}
        <path d="M28 50
                 L29 53
                 L32 54
                 L29 55
                 L28 58
                 L27 55
                 L24 54
                 L27 53 Z" />
        {/* Right star */}
        <path d="M72 50
                 L73 53
                 L76 54
                 L73 55
                 L72 58
                 L71 55
                 L68 54
                 L71 53 Z" />
      </g>

      {/* Two small crossed-utensil lines under "KITCHEN" for a hand-drawn stamp feel */}
      <g
        stroke="#FFD400"
        strokeWidth="1.2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        {/* Left diagonal (knife) */}
        <line x1="42" y1="78" x2="50" y2="74" />
        {/* Right diagonal (fork) */}
        <line x1="58" y1="78" x2="50" y2="74" />
        {/* Small fork tines */}
        <line x1="57" y1="76.5" x2="58.5" y2="79" />
        <line x1="58.5" y1="76.5" x2="60" y2="79" />
      </g>
    </svg>
  )
}
