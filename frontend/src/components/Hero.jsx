// Hero section with animated background built with Framer Motion
// Bold yellow spark/flash particles on a black background

import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import AnimatedGradient from './AnimatedGradient'

export default function Hero() {
  // Respect user's motion preference
  const shouldReduceMotion = useReducedMotion()

  // Generate spark particle data
  const sparks = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 4,
    duration: 1.5 + Math.random() * 2,
    delay: Math.random() * 2,
  }))

  return (
    <section
      className="relative bg-transparent text-brand-white overflow-hidden min-h-[600px] flex items-center"
      aria-label="Welcome to Habibizz Kitchens"
    >
      {/* Animated background - sparks */}
      <div className="absolute inset-0" aria-hidden="true">
        {/* Ambient WebGL gradient - a deep, on-brand swirl behind the
            content. Paced slow and soft so it reads as atmosphere rather
            than noise. Disabled by the component when `isMounted` only
            runs on the client (WebGL needs the DOM). */}
        {!shouldReduceMotion && (
          <AnimatedGradient
            config={{
              preset: 'custom',
              color1: '#0D0D0D',
              color2: '#3a2b00',
              color3: '#FFD400',
              rotation: -30,
              proportion: 40,
              scale: 0.35,
              speed: 12,
              distortion: 3,
              swirl: 60,
              swirlIterations: 5,
              softness: 100,
              offset: 0,
              shape: 'Edge',
              shapeSize: 30,
            }}
          />
        )}

        {/* Diagonal sweep gradient */}
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, transparent 0%, transparent 40%, rgba(255, 212, 0, 0.06) 50%, transparent 60%, transparent 100%)',
            backgroundSize: '200% 200%',
          }}
          animate={
            shouldReduceMotion
              ? {}
              : {
                  backgroundPosition: ['0% 0%', '200% 200%'],
                }
          }
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        {/* Spark particles */}
        {!shouldReduceMotion &&
          sparks.map((spark) => (
            <motion.div
              key={spark.id}
              className="absolute rounded-full bg-brand-yellow"
              style={{
                left: `${spark.x}%`,
                top: `${spark.y}%`,
                width: `${spark.size}px`,
                height: `${spark.size}px`,
                boxShadow: '0 0 6px #FFD400',
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: spark.duration,
                delay: spark.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}

        {/* Static stars fallback if reduced motion */}
        {shouldReduceMotion &&
          sparks.slice(0, 10).map((spark) => (
            <div
              key={spark.id}
              className="absolute rounded-full bg-brand-yellow/50"
              style={{
                left: `${spark.x}%`,
                top: `${spark.y}%`,
                width: `${spark.size}px`,
                height: `${spark.size}px`,
              }}
            />
          ))}
      </div>

      {/* Hero content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 w-full">
        <div className="max-w-3xl">
          <motion.h1
            className="font-display text-[2.75rem] leading-[0.95] sm:text-7xl sm:leading-none lg:text-8xl tracking-tight mb-4 sm:mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="text-brand-white">BOLD</span>
            <br />
            <span className="text-brand-yellow drop-shadow-[0_0_30px_rgba(255,212,0,0.5)]">FLAVOR.</span>
            <br />
            <span className="text-brand-white">FAST.</span>
          </motion.h1>

          <motion.p
            className="text-base sm:text-xl text-brand-white/80 mb-6 sm:mb-10 max-w-xl font-body"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Habibizz Kitchens serves up no-fuss fast food that hits hard.
            Smashburgers, crispy sides, and icy drinks — built for people who are hungry right now.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
          >
            <Link
              to="/menu"
              className="inline-block bg-brand-yellow text-brand-black font-display text-base sm:text-lg uppercase tracking-wider px-7 sm:px-10 py-3 sm:py-4 rounded-full hover:bg-brand-yellow-warm shadow-xl shadow-brand-yellow/30 hover:shadow-2xl hover:shadow-brand-yellow/40 transition-all duration-300 hover:-translate-y-1 active:translate-y-0"
              aria-label="Start your order - go to menu"
            >
              <span className="sm:hidden">ORDER NOW</span>
              <span className="hidden sm:inline">START YOUR ORDER</span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}