// AdminMenuPage - the shopkeeper's menu editor at /admin/menu.
//
// Lets the shopkeeper add, edit, and delete menu items without touching
// menu.json by hand. Same admin visual language as the dashboard (black
// header, brand-yellow accents, white bordered cards), and the same
// session-token auth (localStorage 'habibizz-admin-token').
//
// Items are fetched from GET /api/menu. Editing/adding/deleting hit the
// admin-only POST / PATCH / DELETE /api/menu endpoints.

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import AdminLogin from './AdminLogin'
import api from '../apiClient'

const TOKEN_KEY = 'habibizz-admin-token'

// Empty form used both for "add item" and as the starting point of any
// edit form before it's filled in.
const EMPTY_FORM = {
  name: '',
  price: '',
  category: '',
  description: '',
  tags: '',
  imageUrl: '',
}

// Shared admin input styling.
const inputClass =
  'w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm text-brand-black focus:border-brand-yellow focus:outline-none'

export default function AdminMenuPage() {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || null
    } catch {
      return null
    }
  })

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null) // small success/error toast

  // Which item is currently being edited (id or null). When set, the form
  // switches to "editing" mode for that item.
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const loadMenu = async () => {
    try {
      const res = await fetch(api('/api/menu'))
      if (!res.ok) throw new Error('Failed to load menu')
      setItems(await res.json())
      setLoading(false)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMenu()
  }, [])

  // Bounce to the login screen when the session is bad.
  const handleLogout = () => {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // ignore
    }
    setToken(null)
  }

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  // Fill the form with an item's values (for editing) or reset (for add).
  const beginEdit = (item) => {
    setEditingId(item.id)
    setForm({
      name: item.name || '',
      price: String(item.price ?? ''),
      category: item.category || '',
      description: item.description || '',
      tags: (item.tags || []).join(', '),
      imageUrl: item.imageUrl || '',
    })
  }
  const beginAdd = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const flash = (msg, isError = false) => {
    setNotice({ msg, isError })
    setTimeout(() => setNotice(null), 3000)
  }

  // Submit: create (POST) when not editing, else update (PATCH).
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name: form.name,
      price: Number(form.price),
      category: form.category,
      description: form.description,
      tags: form.tags,
      imageUrl: form.imageUrl,
    }
    try {
      const url = editingId ? `/api/menu/${editingId}` : '/api/menu'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
        body: JSON.stringify(payload),
      })
      if (res.status === 401) {
        handleLogout()
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save item')
      }
      await loadMenu()
      beginAdd()
      flash(editingId ? 'Item updated' : 'Item added')
    } catch (err) {
      flash(err.message, true)
    } finally {
      setSaving(false)
    }
  }

  // Remove an item after a confirmation.
  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This can't be undone.`)) return
    try {
      const res = await fetch(api(`/api/menu/${item.id}`), {
        method: 'DELETE',
        headers: { 'x-admin-token': token },
      })
      if (res.status === 401) {
        handleLogout()
        return
      }
      if (!res.ok) throw new Error('Failed to delete item')
      await loadMenu()
      if (editingId === item.id) beginAdd()
      flash(`Removed "${item.name}"`)
    } catch (err) {
      flash(err.message, true)
    }
  }

  if (!token) {
    return <AdminLogin onLogin={(t) => setToken(t)} />
  }

  // Group items by category for a scannable listing.
  const categories = [...new Set(items.map((i) => i.category))].sort()

  return (
    <div className="min-h-screen bg-brand-offwhite text-brand-black">
      {/* Header - mirrors the dashboard header */}
      <header className="bg-brand-black text-brand-white py-4 px-6 border-b-4 border-brand-yellow">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl">
              <span className="text-brand-yellow">HABI</span>BIZZ MENU
            </h1>
            <p className="text-sm text-brand-white/60 mt-1 font-body">
              Add, edit, and remove menu items
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="text-brand-yellow hover:text-brand-white text-sm font-bold underline"
            >
              ← Dashboard
            </Link>
            <Link
              to="/"
              className="text-brand-yellow hover:text-brand-white text-sm font-bold underline"
            >
              Back to Store
            </Link>
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
        {/* Notice toast */}
        {notice && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg border-2 text-sm font-bold ${
              notice.isError
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'bg-green-50 border-green-300 text-green-700'
            }`}
          >
            {notice.msg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ---- Form (add / edit) ---- */}
          <div className="lg:col-span-1">
            <div className="bg-white border-2 border-gray-200 p-5 sticky lg:top-4">
              <h2 className="font-display text-lg mb-4">
                {editingId ? 'EDIT ITEM' : 'ADD NEW ITEM'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    required
                    className={inputClass}
                    placeholder="Classic Burger"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Price ($) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setField('price', e.target.value)}
                      required
                      className={inputClass}
                      placeholder="8.99"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Category *
                    </label>
                    <input
                      type="text"
                      list="menu-categories"
                      value={form.category}
                      onChange={(e) => setField('category', e.target.value)}
                      required
                      className={inputClass}
                      placeholder="Burgers"
                    />
                    <datalist id="menu-categories">
                      {['Burgers', 'Sides', 'Drinks', 'Desserts', 'Chicken'].map(
                        (c) => (
                          <option key={c} value={c} />
                        )
                      )}
                    </datalist>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    className={inputClass}
                    placeholder="Two beef patties, cheese, lettuce..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => setField('tags', e.target.value)}
                    className={inputClass}
                    placeholder="signature, spicy"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Image URL (optional)
                  </label>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) => setField('imageUrl', e.target.value)}
                    className={inputClass}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-brand-yellow text-brand-black font-display uppercase tracking-wider text-sm px-4 py-2.5 rounded-full shadow-lg shadow-brand-yellow/20 hover:bg-brand-yellow-warm transition-all disabled:opacity-50"
                  >
                    {saving ? 'SAVING...' : editingId ? 'SAVE CHANGES' : 'ADD ITEM'}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={beginAdd}
                      className="px-4 py-2.5 border-2 border-gray-300 text-sm font-bold rounded-full hover:bg-gray-100 transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* ---- Menu list ---- */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading menu...</div>
            ) : error ? (
              <div className="text-center py-12 text-red-600">{error}</div>
            ) : (
              categories.map((cat) => (
                <div key={cat} className="mb-8">
                  <h3 className="font-display text-xl text-brand-black border-b-2 border-brand-yellow pb-2 mb-3">
                    {cat}
                  </h3>
                  <ul className="space-y-2">
                    {items
                      .filter((i) => i.category === cat)
                      .map((item) => (
                        <li
                          key={item.id}
                          className="bg-white border-2 border-gray-200 p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-display text-sm text-brand-black">
                                {item.name}
                              </span>
                              <span className="text-xs text-gray-500 font-bold">
                                ${Number(item.price).toFixed(2)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {item.description || '—'}
                            </p>
                            {item.tags && item.tags.length > 0 && (
                              <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">
                                {item.tags.join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => beginEdit(item)}
                              className="text-xs font-bold bg-brand-black text-white px-3 py-1.5 rounded-full hover:bg-brand-black/80 transition-all"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              className="text-xs font-bold bg-red-500 text-white px-3 py-1.5 rounded-full hover:bg-red-600 transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}