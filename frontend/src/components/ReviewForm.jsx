import { useState } from 'react'

export default function ReviewForm({ onSave, onClose, loading, beverageRef = '' }) {
  const [form, setForm] = useState({ beverage_ref: beverageRef, body: '', rating: '' })
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface border-t border-t-gold/15 rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border-soft">
          <h2 className="font-serif text-gold text-lg">Nueva reseña</h2>
          <button onClick={onClose} className="text-muted hover:text-ink-soft transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSave({
              beverage_ref: form.beverage_ref,
              body:         form.body    || null,
              rating:       form.rating  ? parseFloat(form.rating) : null,
            })
          }}
          className="p-4 space-y-3"
        >
          <div>
            <label className="label-caps block mb-1">Bebida *</label>
            <input
              name="beverage_ref" required
              value={form.beverage_ref} onChange={set}
              placeholder="Ej: Catena Zapata Malbec 2019"
              className="field"
            />
          </div>
          <div>
            <label className="label-caps block mb-1">Reseña</label>
            <textarea
              name="body" rows={3}
              value={form.body} onChange={set}
              placeholder="Contá tu experiencia..."
              className="field resize-none"
            />
          </div>
          <div>
            <label className="label-caps block mb-1">Puntuación (0–10)</label>
            <input
              name="rating" type="number" min="0" max="10" step="0.5"
              value={form.rating} onChange={set}
              placeholder="8.5"
              className="field"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !form.beverage_ref.trim()}
            className="btn-primary rounded-lg"
          >
            {loading ? 'Publicando...' : 'Publicar reseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
