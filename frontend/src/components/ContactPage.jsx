// ContactPage - /contact route. Phone, address, hours, social links.
import { useEffect } from 'react'

export default function ContactPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [])

  return (
    <div className="bg-brand-offwhite text-brand-black">
      {/* Banner - dark with a soft yellow radial behind the H1.
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
            GET IN <span className="text-brand-yellow">TOUCH</span>
          </h1>
          <p className="text-lg text-brand-white/80 font-body max-w-2xl mx-auto">
            Hungry? Lost? Found a hair in your fries? Here's how to reach us.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Call us */}
            <div className="bg-brand-white p-8 border-t-4 border-brand-yellow">
              <h2 className="font-display text-2xl mb-3">CALL US</h2>
              <p className="text-gray-700 font-body mb-4">
                Fastest way to reach a real person. Pickup, delivery, complaints,
                compliments - all of it.
              </p>
              <a
                href="tel:+15555551234"
                className="font-display text-3xl text-brand-black hover:text-brand-yellow transition-colors"
              >
                (555) 555-1234
              </a>
            </div>

            {/* Visit us */}
            <div className="bg-brand-white p-8 border-t-4 border-brand-yellow">
              <h2 className="font-display text-2xl mb-3">VISIT US</h2>
              <p className="text-gray-700 font-body mb-2">
                123 Flavor Street
                <br />
                Your City, ST 00000
              </p>
              <p className="text-gray-600 text-sm font-body">
                Corner of Flavor & 1st. Free parking behind the building.
              </p>
            </div>

            {/* Hours */}
            <div className="bg-brand-white p-8 border-t-4 border-brand-yellow md:col-span-2">
              <h2 className="font-display text-2xl mb-4">HOURS</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-body">
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="font-bold">Mon - Thu</span>
                  <span>11am - 10pm</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="font-bold">Fri - Sat</span>
                  <span>11am - 12am</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="font-bold">Sun</span>
                  <span>12pm - 9pm</span>
                </div>
              </div>
            </div>

            {/* Follow us */}
            <div className="bg-brand-white p-8 border-t-4 border-brand-yellow md:col-span-2">
              <h2 className="font-display text-2xl mb-4">FOLLOW US</h2>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Instagram', href: 'https://instagram.com' },
                  { label: 'TikTok', href: 'https://tiktok.com' },
                  { label: 'Twitter', href: 'https://twitter.com' },
                  { label: 'Facebook', href: 'https://facebook.com' },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="bg-brand-black text-brand-yellow font-bold px-4 py-2 hover:bg-brand-yellow hover:text-brand-black transition-colors"
                    aria-label={link.label}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
