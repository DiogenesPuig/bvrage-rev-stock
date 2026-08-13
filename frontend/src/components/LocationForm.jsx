import { useState } from 'react'

export default function LocationForm({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState({ name: '', description: '', ...initial })
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface border-t border-t-gold/15 rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-border-soft">
          <h2 className="font-serif text-gold text-lg">{initial ? 'Editar ubicación' : 'Nueva ubicación'}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink-soft transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); onSave(form) }}
          className="p-4 space-y-3"
        >
          <div>
            <label className="label-caps block mb-1">Nombre *</label>
            <input name="name" required value={form.name} onChange={set} placeholder="Ej: Heladera, Bodega, Estante..." className="field" />
          </div>
          <div>
            <label className="label-caps block mb-1">Descripción</label>
            <input name="description" value={form.description} onChange={set} placeholder="Descripción opcional" className="field" />
          </div>
          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            className="btn-primary rounded-lg"
          >
            {loading ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear ubicación'}
          </button>
        </form>
      </div>
    </div>
  )
}
