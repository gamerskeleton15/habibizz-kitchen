// AboutPage - /about route. Brand story, chef bio, hours (moved from footer).
import { useEffect } from 'react'

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  return (
    <div className="bg-brand-offwhite text-brand-black">
      {/* Hero banner - dark with a soft yellow radial behind the H1.
          No hard border-b-4: the original thick yellow line read as a
          visible "partition" between the dark hero and the white card
          below. A soft radial glow at the bottom fades black->yellow->black
          so the join feels like a smooth transition instead of a cut. */}
      <section className="relative bg-brand-black text-brand-white py-20 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255, 212, 0, 0.18), transparent 70%)',
          }}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="font-display text-5xl sm:text-6xl mb-4">
            OUR <span className="text-brand-yellow">STORY</span>
          </h1>
          <p className="text-lg text-brand-white/80 font-body max-w-2xl mx-auto">
            Bold flavor, built fast. No compromises, no apologies.
          </p>
        </div>
      </section>

      {/* Brand story */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl sm:text-4xl mb-6">
            Who we are
          </h2>
          <div className="space-y-4 text-gray-800 font-body text-lg leading-relaxed">
            <p>
              Habibizz Kitchens started with a simple question: why does fast food
              have to taste like an apology? We set out to build a kitchen that
              hits hard — smashburgers with real char, fries that are actually
              crispy, drinks that are properly cold.
            </p>
            <p>
              Every item on our menu is cooked to order. Nothing sits under a heat
              lamp waiting to be someone else's lunch. When you order from us,
              we start the grill.
            </p>
            <p>
              We keep the menu tight on purpose. A short list, done right, every
              time. That's the whole pitch.
            </p>
          </div>
        </div>
      </section>

      {/* Chef bio */}
      <section className="py-16 sm:py-20 bg-brand-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Chef avatar placeholder - gold circle with chef hat initials */}
            <div className="md:col-span-1 flex justify-center">
              <div className="w-40 h-40 rounded-full bg-brand-yellow flex items-center justify-center">
                <span className="font-display text-5xl text-brand-black">HK</span>
              </div>
            </div>
            <div className="md:col-span-2">
              <h2 className="font-display text-3xl sm:text-4xl mb-4">
                Meet the chef
              </h2>
              <h3 className="font-display text-xl text-brand-yellow bg-brand-black inline-block px-2 mb-4">
                Head Chef & Founder
              </h3>
              <p className="text-gray-800 font-body text-lg leading-relaxed">
                Trained in the chaos of a busy downtown kitchen, our chef has spent
                fifteen years obsessing over how to make fast food taste like it
                cares. Every sauce, every seasoning, every sear — it all starts
                with respect for the ingredients and zero patience for shortcuts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hours (moved here from the footer) */}
      <section id="hours" className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl sm:text-4xl mb-6">
            When we're open
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-body text-lg">
            <div className="bg-brand-white border-l-4 border-brand-yellow p-4 flex justify-between">
              <span className="font-bold">Mon - Thu</span>
              <span>11am - 10pm</span>
            </div>
            <div className="bg-brand-white border-l-4 border-brand-yellow p-4 flex justify-between">
              <span className="font-bold">Fri - Sat</span>
              <span>11am - 12am</span>
            </div>
            <div className="bg-brand-white border-l-4 border-brand-yellow p-4 flex justify-between sm:col-span-2">
              <span className="font-bold">Sun</span>
              <span>12pm - 9pm</span>
            </div>
          </div>
        </div>
      </section>

      {/* Values strip */}
      <section className="py-16 sm:py-20 bg-brand-black text-brand-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl sm:text-4xl mb-10 text-center">
            What we stand for
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { title: 'Made fresh', body: 'Cooked to order. Always.' },
              { title: 'Tight menu', body: 'A short list, done right, every time.' },
              { title: 'No nonsense', body: 'Bold flavor, fair prices, fast service.' },
            ].map((v) => (
              <div key={v.title} className="text-center">
                <h3 className="font-display text-2xl text-brand-yellow mb-3">
                  {v.title}
                </h3>
                <p className="text-brand-white/80 font-body">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
