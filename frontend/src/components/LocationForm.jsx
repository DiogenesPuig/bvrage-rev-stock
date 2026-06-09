import { useState } from 'react'

export default function LocationForm({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState({ name: '', description: '', ...initial })
  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-zinc-900 rounded-t-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-100">{initial ? 'Editar ubicación' : 'Nueva ubicación'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); onSave(form) }}
          className="p-4 space-y-3"
        >
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Nombre *</label>
            <input name="name" required value={form.name} onChange={set} placeholder="Ej: Heladera, Bodega, Estante..." className="field" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Descripción</label>
            <input name="description" value={form.description} onChange={set} placeholder="Descripción opcional" className="field" />
          </div>
          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            className="w-full bg-zinc-100 text-zinc-900 font-medium rounded-lg py-2.5 hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : initial ? 'Guardar cambios' : 'Crear ubicación'}
          </button>
        </form>
      </div>
    </div>
  )
}
