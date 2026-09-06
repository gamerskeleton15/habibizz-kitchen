// CursorGlow - a soft yellow "light follows your cursor" effect.
//
// A fixed full-viewport element with pointer-events: none, so it never
// blocks clicks. Listens to mousemove on window and renders a soft
// yellow radial gradient at the cursor position. Sits at z-0, behind
// all page content, above the body's aurora/ember background.
//
// Three guardrails:
//   1. Skipped entirely on touch-only devices (no cursor to follow).
//   2. Skipped if the user has prefers-reduced-motion: reduce.
//   3. The glow follows the cursor with a small lerp (eased toward the
//      real position) instead of snapping instantly, so the effect
//      reads as a "light" not a "marker" - more atmospheric.

import { useEffect, useRef, useState } from 'react'

// Eased cursor position so the glow lags slightly behind the actual
// mouse. Higher value = snappier. 0.28 keeps a touch of inertia so it
// still reads as a light rather than a glued-on marker, but is much
// more responsive than the original 0.18.
const LERP = 0.28

export default function CursorGlow() {
  // Real cursor position (where the mouse actually is)
  const target = useRef({ x: -1000, y: -1000 })
  // Eased position (where the glow actually renders) - starts offscreen
  const pos = useRef({ x: -1000, y: -1000 })
  const raf = useRef(null)
  const [mounted, setMounted] = useState(false)
  const [shouldRender, setShouldRender] = useState(true)

  // Decide whether to render at all - on mount, check for touch + motion.
  useEffect(() => {
    setMounted(true)

    // Touch-only device check: coarse pointer = no fine mouse.
    const isTouchOnly =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(pointer: coarse)').matches &&
      !window.matchMedia('(hover: hover)').matches
    if (isTouchOnly) {
      setShouldRender(false)
      return
    }

    // Reduced motion check.
    const motionQuery =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motionQuery?.matches) {
      setShouldRender(false)
      return
    }

    const handleMove = (e) => {
      // clientX/Y are viewport-relative, which is what we want for a
      // fixed-position element.
      target.current.x = e.clientX
      target.current.y = e.clientY
    }

    // Animation loop: lerp pos toward target every frame.
    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * LERP
      pos.current.y += (target.current.y - pos.current.y) * LERP
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`
      }
      raf.current = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    raf.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [])

  // The DOM ref is the element we translate each frame. Kept as a ref
  // (not state) so updating it doesn't trigger a React re-render.
  const glowRef = useRef(null)

  if (!mounted || !shouldRender) return null

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      // Inline style: don't render anything visible until the first
      // mousemove lands. The transform is updated by the rAF loop above.
    >
      <div
        ref={glowRef}
        // The glow itself: a 240px yellow radial - smaller than the
        // 600px original so it reads as a "spotlight on the cursor" and
        // not a page-wide wash. The gradient is also tighter (visible
        // core in the inner 30%, fully transparent by 50%) and the
        // center opacity is higher (0.42 vs 0.18) so it actually reads
        // on top of the dark aurora + frosted glass.
        // mix-blend-mode: screen still brightens the dark backdrop
        // without painting solid color, and translate3d centers the
        // div on the cursor (radial centered at 50% 50%).
        className="absolute top-0 left-0 w-[240px] h-[240px] -ml-[120px] -mt-[120px] rounded-full will-change-transform"
        style={{
          background:
            'radial-gradient(circle, rgba(255, 212, 0, 0.42) 0%, rgba(255, 212, 0, 0.28) 18%, rgba(255, 212, 0, 0.10) 35%, transparent 50%)',
          mixBlendMode: 'screen',
          transform: 'translate3d(-1000px, -1000px, 0)',
        }}
      />
    </div>
  )
}
