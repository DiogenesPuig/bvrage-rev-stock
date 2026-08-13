import { useState, useEffect } from 'react'
import { api } from '../services/api'

const TYPES = ['wine', 'beer', 'spirits', 'other']
const TYPE_LABELS = { wine: 'Vino', beer: 'Cerveza', spirits: 'Destilado', other: 'Otro' }

const EMPTY = {
  type: 'wine', name: '', producer: '', country: '',
  region: '', vintage: '', grape_variety: '', alcohol_pct: '',
  personal_note: '', rating: '',
}

export default function BeverageForm({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const [locationId, setLocationId] = useState('')
  const [newLocationName, setNewLocationName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [locations, setLocations] = useState([])
  const [creatingLocation, setCreatingLocation] = useState(false)

  const isNew = !initial?.id

  useEffect(() => {
    if (!isNew) return
    api.get('/locations').then(setLocations).catch(() => {})
  }, [isNew])

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()

    let finalLocationId = locationId || null
    if (isNew && quantity && locationId === '__new__') {
      if (!newLocationName.trim()) return
      setCreatingLocation(true)
      try {
        const loc = await api.post('/locations', { name: newLocationName.trim() })
        finalLocationId = loc.id
      } catch (err) {
        alert(err?.error || 'Error al crear la ubicación')
        setCreatingLocation(false)
        return
      }
      setCreatingLocation(false)
    }

    onSave({
      ...form,
      vintage:     form.vintage     ? parseInt(form.vintage)      : null,
      alcohol_pct: form.alcohol_pct ? parseFloat(form.alcohol_pct) : null,
      rating:      form.rating      ? parseFloat(form.rating)      : null,
      ...(isNew && quantity ? {
        initial_location_id: finalLocationId,
        initial_quantity:    parseInt(quantity),
      } : {}),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-surface border-t border-t-gold/15 rounded-t-2xl sm:rounded-2xl max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border-soft">
          <h2 className="font-serif text-gold text-lg">
            {isNew ? 'Nueva bebida' : 'Editar bebida'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink-soft transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-3">
          <div>
            <label className="label-caps block mb-1.5">Tipo</label>
            <div className="flex gap-2 flex-wrap">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    form.type === t
                      ? 'bg-gold text-[#402d00] font-medium'
                      : 'bg-chip text-ink-soft hover:text-ink'
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {isNew && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-caps block mb-1.5">Ubicación</label>
                  <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="field">
                    <option value="">Sin ubicación específica</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                    <option value="__new__">+ Nueva ubicación...</option>
                  </select>
                </div>
                <div>
                  <label className="label-caps block mb-1.5">Cantidad</label>
                  <input
                    type="number" min="0" step="1"
                    value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0"
                    className="field"
                  />
                </div>
              </div>

              {locationId === '__new__' && (
                <input
                  type="text"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="Nombre de la nueva ubicación"
                  className="field"
                  autoFocus
                />
              )}
            </div>
          )}

          <Field label="Nombre *" name="name" value={form.name} onChange={set} required placeholder="Ej: Malbec Reserva" />
          <Field label="Productor / Bodega" name="producer" value={form.producer} onChange={set} placeholder="Ej: Catena Zapata" />

          <div className="grid grid-cols-2 gap-3">
            <Field label="País" name="country" value={form.country} onChange={set} placeholder="Argentina" />
            <Field label="Región" name="region" value={form.region} onChange={set} placeholder="Mendoza" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cosecha" name="vintage" value={form.vintage} onChange={set} type="number" placeholder="2021" min="1900" max="2099" />
            <Field label="Alcohol %" name="alcohol_pct" value={form.alcohol_pct} onChange={set} type="number" placeholder="14.5" step="0.1" min="0" max="100" />
          </div>

          <Field label="Variedad / Estilo" name="grape_variety" value={form.grape_variety} onChange={set} placeholder="Ej: Malbec, IPA, Single Malt" />
          <Field label="Nota personal" name="personal_note" value={form.personal_note} onChange={set} placeholder="Notas de cata, maridajes..." textarea />
          <Field label="Puntuación (0-10)" name="rating" value={form.rating} onChange={set} type="number" placeholder="8.5" step="0.5" min="0" max="10" />

          <button
            type="submit"
            disabled={loading || creatingLocation || !form.name.trim()}
            className="btn-primary rounded-lg mt-2"
          >
            {loading || creatingLocation ? 'Guardando...' : isNew ? 'Agregar bebida' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, textarea, ...props }) {
  return (
    <div>
      <label className="label-caps block mb-1.5">{label}</label>
      {textarea
        ? <textarea rows={3} className="field" {...props} />
        : <input className="field" {...props} />
      }
    </div>
  )
}
