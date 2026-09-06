// AdminHistoryPage - the shopkeeper's daily archive at /admin/history.
//
// Every day that has orders appears here as its own entry ("daily page").
// Past days are saved and browsable as history, and each day can be
// downloaded as a CSV so the shopkeeper can keep records. Today's orders
// show up at the top of the list too.
//
// Uses the same session token + visual language as the other admin pages.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminLogin from './AdminLogin'

const TOKEN_KEY = 'habibizz-admin-token'

// Reusable admin style tokens
const headerBtn =
  'text-brand-yellow hover:text-brand-white text-sm font-bold underline'

export default function AdminHistoryPage() {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null
    } catch {
      return null
    }
  })

  const [dates, setDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // The currently-viewed day (YYYY-MM-DD) and its orders.
  const [selectedDate, setSelectedDate] = useState(null)
  const [dayOrders, setDayOrders] = useState([])
  const [loadingDay, setLoadingDay] = useState(false)

  const handleLogout = () => {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // ignore
    }
    setToken(null)
  }

  // Fetch the list of days that have orders.
  const fetchDates = async () => {
    try {
      const res = await fetch('/api/orders/history/dates', {
        headers: { 'x-admin-token': token },
      })
      if (res.status === 401) {
        handleLogout()
        return
      }
      if (!res.ok) throw new Error('Failed to load history')
      setDates(await res.json())
      setError(null)
      setLoading(false)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) fetchDates()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // View a single day's orders.
  const viewDay = async (date) => {
    setSelectedDate(date)
    setLoadingDay(true)
    try {
      const res = await fetch(`/api/orders/history/${date}`, {
        headers: { 'x-admin-token': token },
      })
      if (res.status === 401) {
        handleLogout()
        return
      }
      if (!res.ok) throw new Error('Failed to load day')
      setDayOrders(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingDay(false)
    }
  }

  // Download a day as CSV. We fetch with the auth token (a plain <a> can't
  // send the x-admin-token header), build a Blob, and trigger the download.
  const downloadDay = async (date) => {
    try {
      const res = await fetch(`/api/orders/history/${date}/export`, {
        headers: { 'x-admin-token': token },
      })
      if (res.status === 401) {
        handleLogout()
        return
      }
      if (!res.ok) throw new Error('Failed to export')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `habibizz-orders-${date}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e.message)
    }
  }

  // A friendly label for a YYYY-MM-DD date, e.g. "Today" / "Sat, Sep 5".
  const formatDayLabel = (date) => {
    const iso = new Date(date + 'T00:00:00')
    const today = new Date().toLocaleDateString('en-CA')
    if (date === today) return 'Today'
    return iso.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: iso.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    })
  }

  if (!token) {
    return <AdminLogin onLogin={(t) => setToken(t)} />
  }

  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-black">
      {/* Header - mirrors the other admin pages */}
      <header className="bg-brand-black text-brand-white py-4 px-6 border-b-4 border-brand-yellow">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl">
              <span className="text-brand-yellow">HABI</span>BIZZ HISTORY
            </h1>
            <p className="text-sm text-brand-white/60 mt-1 font-body">
              Past orders, day by day — view or download
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/menu" className={headerBtn}>Edit Menu</Link>
            <Link to="/admin" className={headerBtn}>← Dashboard</Link>
            <Link to="/" className={headerBtn}>Back to Store</Link>
            <button
              onClick={handleLogout}
              className="bg-brand-yellow text-brand-black text-xs font-display uppercase tracking-wider px-4 py-2 rounded-full shadow-lg shadow-brand-yellow/30 hover:bg-brand-yellow-warm transition-all"
            >
              LOG OUT
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 px-4 py-3 rounded-lg border-2 border-red-300 bg-red-50 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ---- Day list ---- */}
          <div className="lg:col-span-1">
            <h2 className="font-display text-lg mb-3">DAYS</h2>
            {loading ? (
              <div className="text-gray-500 py-8 text-center">Loading history...</div>
            ) : dates.length === 0 ? (
              <div className="bg-white border-2 border-gray-200 p-6 text-center text-gray-500">
                No orders yet. They'll be archived here day by day.
              </div>
            ) : (
              <ul className="space-y-2">
                {dates.map((d) => (
                  <li key={d.date}>
                    <button
                      type="button"
                      onClick={() => viewDay(d.date)}
                      className={`w-full text-left bg-white border-2 p-3 transition-all hover:border-brand-yellow ${
                        selectedDate === d.date ? 'border-brand-yellow' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-sm text-brand-black">
                          {formatDayLabel(d.date)}
                        </span>
                        <span className="text-xs text-gray-400 font-bold">{d.date}</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-bold text-brand-black">
                          {d.count} order{d.count !== 1 ? 's' : ''}
                        </span>
                        <span className="text-sm font-bold text-gray-600">
                          ${Number(d.total).toFixed(2)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ---- Selected day's orders ---- */}
          <div className="lg:col-span-2">
            {selectedDate ? (
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="font-display text-lg">
                    ORDERS — {formatDayLabel(selectedDate).toUpperCase()}
                    <span className="ml-2 text-sm font-normal text-gray-400">{selectedDate}</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => downloadDay(selectedDate)}
                    className="bg-brand-yellow text-brand-black font-display uppercase tracking-wider text-sm px-4 py-2 rounded-full shadow-lg shadow-brand-yellow/20 hover:bg-brand-yellow-warm transition-all"
                  >
                    ⬇ DOWNLOAD CSV
                  </button>
                </div>

                {loadingDay ? (
                  <div className="text-center py-12 text-gray-500">Loading...</div>
                ) : dayOrders.length === 0 ? (
                  <div className="bg-white border-2 border-gray-200 p-6 text-center text-gray-500">
                    No orders on this day.
                  </div>
                ) : (
                  <div className="bg-white border-2 border-gray-200 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-brand-black text-brand-white text-xs uppercase tracking-wider">
                          <th className="px-3 py-2">Order No</th>
                          <th className="px-3 py-2">Time</th>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Fulfillment</th>
                          <th className="px-3 py-2">Items</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="px-3 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayOrders.map((o) => (
                          <tr key={o.id} className="border-t border-gray-200">
                            <td className="px-3 py-2 font-display">{o.orderNumber}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {new Date(o.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                            </td>
                            <td className="px-3 py-2">
                              <span className="font-bold">{o.name}</span>
                              <span className="block text-xs text-gray-400">{o.phone}</span>
                            </td>
                            <td className="px-3 py-2">{o.fulfillmentType}</td>
                            <td className="px-3 py-2 text-xs text-gray-600">
                              {o.items.map((i) => (
                                <div key={i.id} className="whitespace-nowrap">
                                  {i.quantity}× {i.name}
                                </div>
                              ))}
                            </td>
                            <td className="px-3 py-2 text-right font-bold">
                              ${Number(o.total).toFixed(2)}
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-xs uppercase tracking-wider text-gray-500">
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-brand-yellow">
                          <td className="px-3 py-2" colSpan={5}>
                            <span className="font-display text-sm">DAY TOTAL</span>
                          </td>
                          <td className="px-3 py-2 text-right font-display text-brand-black">
                            ${dayOrders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border-2 border-gray-200 p-10 text-center text-gray-500">
                Select a day on the left to view its orders.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}