import { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function ManageStockModal({ beverageId, beverageName, stockByLocation, onClose, onSaved }) {
  const [rows, setRows] = useState(() => stockByLocation.filter((s) => s.quantity > 0))
  const [pending, setPending] = useState({})
  const [locations, setLocations] = useState([])
  const [showAddLoc, setShowAddLoc] = useState(false)
  const [newLocId, setNewLocId] = useState('')
  const [newLocName, setNewLocName] = useState('')
  const [newLocQty, setNewLocQty] = useState('')
  const [addingLoc, setAddingLoc] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    api.get('/locations').then(setLocations).catch(() => {})
  }, [])

  const keyOf = (row) => row.location_id ?? 'null'
  const visibleRows = rows.filter((r) => r.quantity > 0)

  const adjust = async (row, delta) => {
    const key = keyOf(row)
    if (pending[key]) return
    setPending((p) => ({ ...p, [key]: true }))
    setRows((prev) => prev.map((r) => (r === row ? { ...r, quantity: r.quantity + delta } : r)))
    setDirty(true)
    try {
      await api.post('/movements', {
        beverage_id: beverageId,
        location_id: row.location_id,
        type: delta > 0 ? 'purchase' : 'consumption',
        quantity: 1,
      })
    } catch (err) {
      setRows((prev) => prev.map((r) => (r === row ? { ...r, quantity: r.quantity - delta } : r)))
      alert(err?.error || 'No se pudo actualizar')
    } finally {
      setPending((p) => ({ ...p, [key]: false }))
    }
  }

  const availableLocations = locations.filter(
    (l) => !visibleRows.some((r) => r.location_id === l.id)
  )

  const handleAddLocation = async (e) => {
    e.preventDefault()
    const qty = parseInt(newLocQty)
    if (!qty || qty <= 0) return
    setAddingLoc(true)
    try {
      let locationId = newLocId && newLocId !== '__new__' ? Number(newLocId) : null
      let locationName = 'Sin ubicación'
      if (newLocId === '__new__') {
        if (!newLocName.trim()) { setAddingLoc(false); return }
        const loc = await api.post('/locations', { name: newLocName.trim() })
        locationId = loc.id
        locationName = loc.name
      } else if (newLocId) {
        locationName = locations.find((l) => String(l.id) === newLocId)?.name ?? locationName
      }
      await api.post('/movements', {
        beverage_id: beverageId,
        location_id: locationId,
        type: 'purchase',
        quantity: qty,
      })
      setRows((prev) => {
        const existing = prev.find((r) => r.location_id === locationId)
        if (existing) {
          return prev.map((r) => (r === existing ? { ...r, quantity: r.quantity + qty } : r))
        }
        return [...prev, { location_id: locationId, location_name: locationName, quantity: qty }]
      })
      setDirty(true)
      setShowAddLoc(false)
      setNewLocId('')
      setNewLocName('')
      setNewLocQty('')
    } catch (err) {
      alert(err?.error || 'No se pudo agregar')
    } finally {
      setAddingLoc(false)
    }
  }

  const close = () => {
    onClose()
    if (dirty) onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div className="relative w-full max-w-md bg-surface border-t border-t-gold/15 rounded-2xl p-6">
        <button onClick={close} className="absolute top-4 right-4 text-muted hover:text-ink-soft transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <h3 className="font-serif text-gold text-lg mb-5 pr-6">{beverageName}</h3>

        {visibleRows.length === 0 && !showAddLoc && (
          <p className="text-sm text-muted text-center mb-4">Sin stock</p>
        )}

        {visibleRows.length === 1 ? (
          <div className="text-center mb-5">
            <p className="text-xs text-ink-soft mb-2">{visibleRows[0].location_name ?? 'Sin ubicación'}</p>
            <div className="flex items-center justify-center gap-5">
              <StepButton onClick={() => adjust(visibleRows[0], -1)} disabled={pending[keyOf(visibleRows[0])]}>−</StepButton>
              <span className="font-serif text-3xl text-gold w-12 text-center">{visibleRows[0].quantity}</span>
              <StepButton primary onClick={() => adjust(visibleRows[0], 1)} disabled={pending[keyOf(visibleRows[0])]}>+</StepButton>
            </div>
          </div>
        ) : visibleRows.length > 1 ? (
          <div className="space-y-2 mb-5">
            {visibleRows.map((row) => (
              <div key={keyOf(row)} className="flex items-center justify-between bg-canvas-deep rounded-lg px-3.5 py-2.5">
                <p className="text-sm text-ink-soft">{row.location_name ?? 'Sin ubicación'}</p>
                <div className="flex items-center gap-2">
                  <StepButton small onClick={() => adjust(row, -1)} disabled={pending[keyOf(row)]}>−</StepButton>
                  <span className="w-5 text-center text-sm">{row.quantity}</span>
                  <StepButton small primary onClick={() => adjust(row, 1)} disabled={pending[keyOf(row)]}>+</StepButton>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {showAddLoc ? (
          <form onSubmit={handleAddLocation} className="bg-canvas-deep rounded-lg p-3.5 space-y-2.5 mb-3">
            <select value={newLocId} onChange={(e) => setNewLocId(e.target.value)} className="field">
              <option value="">Sin ubicación específica</option>
              {availableLocations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
              <option value="__new__">+ Nueva ubicación...</option>
            </select>
            {newLocId === '__new__' && (
              <input
                className="field"
                value={newLocName}
                onChange={(e) => setNewLocName(e.target.value)}
                placeholder="Nombre de la ubicación"
                autoFocus
              />
            )}
            <input
              className="field"
              type="number" min="1" step="1"
              value={newLocQty}
              onChange={(e) => setNewLocQty(e.target.value)}
              placeholder="Cantidad"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={addingLoc} className="btn-primary rounded-lg flex-1">
                {addingLoc ? 'Agregando...' : 'Agregar'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddLoc(false)}
                className="flex-1 bg-chip text-ink-soft rounded-lg py-2.5 text-sm hover:text-ink transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAddLoc(true)} className="btn-outline rounded-lg">
            + Agregar en otra ubicación
          </button>
        )}
      </div>
    </div>
  )
}

function StepButton({ children, primary, small, ...props }) {
  const size = small ? 'w-8 h-8' : 'w-11 h-11'
  return (
    <button
      type="button"
      {...props}
      className={`${size} rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 ${
        primary
          ? 'bg-gold text-[#402d00] hover:bg-gold-hover'
          : 'border border-border text-ink hover:border-gold/40'
      }`}
    >
      {children}
    </button>
  )
}
