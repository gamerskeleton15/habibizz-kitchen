// Footer component with brand, location, social, and a Pages column.
// Hours moved to /about and /contact.
import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer
      className="bg-black/60 backdrop-blur-xl text-brand-white py-12 border-t border-white/10"
      aria-label="Footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            {/* Circular badge logo, larger in the footer. Wrapped in a <Link> with
                a focus ring so it's keyboard-accessible. */}
            <Link
              to="/"
              className="inline-block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              aria-label="Habibizz Kitchens home"
            >
              <Logo size={72} />
            </Link>
            <p className="text-brand-white/70 text-sm font-body mt-3">
              Bold flavor. Fast. No apologies.
            </p>
          </div>

          {/* Pages - new routes */}
          <div>
            <h4 className="font-display text-lg mb-3 text-brand-yellow">PAGES</h4>
            <ul className="space-y-1 text-sm font-body">
              <li>
                <Link to="/menu" className="text-brand-white/80 hover:text-brand-yellow">
                  Menu
                </Link>
              </li>
              <li>
                <Link to="/portfolio" className="text-brand-white/80 hover:text-brand-yellow">
                  Gallery
                </Link>
              </li>
              <li>
                <Link to="/orders" className="text-brand-white/80 hover:text-brand-yellow">
                  Orders
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-brand-white/80 hover:text-brand-yellow">
                  About
                </Link>
              </li>
              <li>
                <Link to="/support" className="text-brand-white/80 hover:text-brand-yellow">
                  Support
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-brand-white/80 hover:text-brand-yellow">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Location */}
          <div>
            <h4 className="font-display text-lg mb-3 text-brand-yellow">LOCATION</h4>
            <p className="text-sm font-body text-brand-white/80">
              123 Flavor Street
              <br />
              Your City, ST 00000
            </p>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-display text-lg mb-3 text-brand-yellow">FOLLOW US</h4>
            <ul className="space-y-1 text-sm font-body">
              <li>
                <a
                  href="https://instagram.com"
                  className="text-brand-white/80 hover:text-brand-yellow"
                  aria-label="Instagram"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://tiktok.com"
                  className="text-brand-white/80 hover:text-brand-yellow"
                  aria-label="TikTok"
                >
                  TikTok
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com"
                  className="text-brand-white/80 hover:text-brand-yellow"
                  aria-label="Twitter"
                >
                  Twitter
                </a>
              </li>
              <li>
                <a
                  href="https://facebook.com"
                  className="text-brand-white/80 hover:text-brand-yellow"
                  aria-label="Facebook"
                >
                  Facebook
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-brand-white/10 text-center text-xs text-brand-white/50 font-body">
          © {new Date().getFullYear()} Habibizz Kitchens. All rights reserved.
        </div>
      </div>
    </footer>
  )
}