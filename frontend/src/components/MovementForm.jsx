import { useState, useEffect } from 'react'
import { api } from '../services/api'

const TYPES = [
  { value: 'purchase',    label: 'Compra',          color: 'text-emerald-400' },
  { value: 'consumption', label: 'Consumo',          color: 'text-red-400' },
  { value: 'transfer',    label: 'Transferencia',    color: 'text-blue-400' },
]

const today = () => new Date().toISOString().split('T')[0]

export default function MovementForm({ beverageId, onSave, onClose, loading }) {
  const [form, setForm]       = useState({ type: 'purchase', quantity: '', location_id: '', date: today(), price: '', occasion: '', notes: '' })
  const [locations, setLocations] = useState([])

  useEffect(() => {
    api.get('/locations').then(setLocations).catch(() => {})
  }, [])

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      beverage_id: beverageId,
      type:        form.type,
      quantity:    parseFloat(form.quantity),
      location_id: form.location_id || null,
      date:        form.date,
      price:       form.price       ? parseFloat(form.price)  : null,
      occasion:    form.occasion    || null,
      notes:       form.notes       || null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-surface border-t border-t-gold/15 rounded-t-2xl sm:rounded-2xl max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border-soft">
          <h2 className="font-serif text-gold text-lg">Registrar movimiento</h2>
          <button onClick={onClose} className="text-muted hover:text-ink-soft transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-4">
          {/* Tipo */}
          <div>
            <label className="label-caps block mb-2">Tipo</label>
            <div className="flex gap-2">
              {TYPES.map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: value }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.type === value
                      ? `bg-chip ${color}`
                      : 'bg-chip/50 text-muted hover:text-ink-soft'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cantidad y fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-caps block mb-1">Cantidad *</label>
              <input
                name="quantity" type="number" min="1" step="1" required
                value={form.quantity} onChange={set}
                placeholder="1"
                className="field"
              />
            </div>
            <div>
              <label className="label-caps block mb-1">Fecha</label>
              <input
                name="date" type="date"
                value={form.date} onChange={set}
                className="field"
              />
            </div>
          </div>

          {/* Ubicación */}
          <div>
            <label className="label-caps block mb-1">Ubicación</label>
            <select name="location_id" value={form.location_id} onChange={set} className="field">
              <option value="">Sin ubicación específica</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Precio (solo compra) */}
          {form.type === 'purchase' && (
            <div>
              <label className="label-caps block mb-1">Precio total</label>
              <input
                name="price" type="number" min="0" step="0.01"
                value={form.price} onChange={set}
                placeholder="0.00"
                className="field"
              />
            </div>
          )}

          {/* Ocasión (solo consumo) */}
          {form.type === 'consumption' && (
            <div>
              <label className="label-caps block mb-1">Ocasión</label>
              <input
                name="occasion" type="text"
                value={form.occasion} onChange={set}
                placeholder="Ej: Cena familiar, cumpleaños..."
                className="field"
              />
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="label-caps block mb-1">Notas</label>
            <textarea
              name="notes" rows={2}
              value={form.notes} onChange={set}
              placeholder="Comentarios adicionales..."
              className="field resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.quantity}
            className="btn-primary rounded-lg"
          >
            {loading ? 'Guardando...' : 'Registrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
