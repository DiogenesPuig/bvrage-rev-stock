import { useState } from 'react'

const TYPES = ['wine', 'beer', 'spirits', 'other']
const TYPE_LABELS = { wine: 'Vino', beer: 'Cerveza', spirits: 'Destilado', other: 'Otro' }

const EMPTY = {
  type: 'wine', name: '', producer: '', country: '',
  region: '', vintage: '', grape_variety: '', alcohol_pct: '',
  personal_note: '', rating: '',
}

export default function BeverageForm({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial })

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...form,
      vintage:     form.vintage     ? parseInt(form.vintage)      : null,
      alcohol_pct: form.alcohol_pct ? parseFloat(form.alcohol_pct) : null,
      rating:      form.rating      ? parseFloat(form.rating)      : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-zinc-900 rounded-t-2xl sm:rounded-2xl max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
          <h2 className="font-semibold text-zinc-100">
            {initial ? 'Editar bebida' : 'Nueva bebida'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-3">
          <div>
            <label className="label">Tipo</label>
            <div className="flex gap-2 flex-wrap">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    form.type === t
                      ? 'bg-zinc-100 text-zinc-900 font-medium'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

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
            disabled={loading || !form.name.trim()}
            className="w-full bg-zinc-100 text-zinc-900 font-medium rounded-lg py-2.5 hover:bg-white transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Guardando...' : initial ? 'Guardar cambios' : 'Agregar bebida'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({ label, textarea, ...props }) {
  const cls = "w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      {textarea
        ? <textarea rows={3} className={cls} {...props} />
        : <input className={cls} {...props} />
      }
    </div>
  )
}
