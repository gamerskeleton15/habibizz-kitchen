// App component - the routing layer for Habibizz Kitchens.
// /             -> customer landing (Home)            - Hero + 3 featured items
// /menu         -> full menu (MenuPage)               - all items, category filter
// /about        -> brand story, chef bio, hours       (AboutPage)
// /contact      -> phone, address, hours, social      (ContactPage)
// /portfolio    -> photo gallery of dishes            (PortfolioPage)
// /orders       -> active + history order list        (OrdersPage)
// /support      -> customer support chat              (SupportPage)
// /admin        -> shopkeeper dashboard (AdminDashboard) - keeps its own header
// /admin/support -> shopkeeper support inbox          (AdminSupportPage)

import { Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import AdminDashboard from './components/AdminDashboard'
import AdminSupportPage from './components/AdminSupportPage'
import AdminMenuPage from './components/AdminMenuPage'
import AdminHistoryPage from './components/AdminHistoryPage'
import PageLayout from './components/PageLayout'
import MenuPage from './components/MenuPage'
import AboutPage from './components/AboutPage'
import ContactPage from './components/ContactPage'
import PortfolioPage from './components/PortfolioPage'
import OrdersPage from './components/OrdersPage'
import SupportPage from './components/SupportPage'
import LoginPage from './components/LoginPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/login"
        element={
          <PageLayout>
            <LoginPage />
          </PageLayout>
        }
      />
      <Route
        path="/menu"
        element={
          <PageLayout>
            {({ onAddToCart }) => (
              <MenuPage onAddToCart={onAddToCart} />
            )}
          </PageLayout>
        }
      />
      <Route
        path="/about"
        element={
          <PageLayout>
            <AboutPage />
          </PageLayout>
        }
      />
      <Route
        path="/contact"
        element={
          <PageLayout>
            <ContactPage />
          </PageLayout>
        }
      />
      <Route
        path="/portfolio"
        element={
          <PageLayout>
            <PortfolioPage />
          </PageLayout>
        }
      />
      <Route
        path="/orders"
        element={
          <PageLayout>
            {({ onReorder }) => <OrdersPage onReorder={onReorder} />}
          </PageLayout>
        }
      />
      <Route
        path="/support"
        element={
          <PageLayout>
            <SupportPage />
          </PageLayout>
        }
      />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/support" element={<AdminSupportPage />} />
      <Route path="/admin/menu" element={<AdminMenuPage />} />
      <Route path="/admin/history" element={<AdminHistoryPage />} />
    </Routes>
  )
}
