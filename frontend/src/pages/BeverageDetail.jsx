import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import BeverageIcon from '../components/BeverageIcon'
import BeverageForm from '../components/BeverageForm'
import MovementForm from '../components/MovementForm'
import { api } from '../services/api'

const MOVEMENT_LABELS = {
  purchase:    { label: 'Compra',       sign: '+', color: 'text-emerald-400' },
  consumption: { label: 'Consumo',      sign: '',  color: 'text-red-400' },
  transfer:    { label: 'Transferencia',sign: '+', color: 'text-blue-400' },
}

const TYPE_LABELS = { wine: 'Vino', beer: 'Cerveza', spirits: 'Destilado', other: 'Otro' }

export default function BeverageDetail() {
  const { id }      = useParams()
  const navigate    = useNavigate()

  const [beverage,   setBeverage]   = useState(null)
  const [movements,  setMovements]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [showEdit,   setShowEdit]   = useState(false)
  const [showMove,   setShowMove]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [bev, movs] = await Promise.all([
        api.get(`/beverages/${id}`),
        api.get(`/beverages/${id}/movements`),
      ])
      setBeverage(bev)
      setMovements(movs)
    } catch {
      setError('No se pudo cargar la bebida')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const handleEdit = async (formData) => {
    setSaving(true)
    try {
      await api.put(`/beverages/${id}`, formData)
      setShowEdit(false)
      fetchData()
    } catch (err) {
      alert(err?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await api.delete(`/beverages/${id}`)
      navigate('/collection', { replace: true })
    } catch (err) {
      alert(err?.error || 'Error al eliminar')
    }
  }

  const handleMovement = async (formData) => {
    setSaving(true)
    try {
      await api.post('/movements', formData)
      setShowMove(false)
      fetchData()
    } catch (err) {
      alert(err?.error || 'Error al registrar movimiento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto md:mx-0 md:max-w-3xl px-4 md:px-8 py-6">

        {/* Back */}
        <button
          onClick={() => navigate('/collection')}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Colección
        </button>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        )}

        {error && <p className="text-red-400 text-sm py-8 text-center">{error}</p>}

        {beverage && (
          <>
            {/* Header de la bebida */}
            <div className="flex gap-4 mb-6">
              <BeverageIcon
                type={beverage.type}
                grape_variety={beverage.grape_variety}
                image_url={beverage.image_url}
                size={72}
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-semibold text-zinc-100 leading-tight">{beverage.name}</h1>
                <p className="text-zinc-500 text-sm mt-0.5">
                  {[beverage.producer, beverage.country, beverage.region].filter(Boolean).join(' · ')}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{TYPE_LABELS[beverage.type] ?? beverage.type}</span>
                  {beverage.vintage     && <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{beverage.vintage}</span>}
                  {beverage.grape_variety && <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{beverage.grape_variety}</span>}
                  {beverage.alcohol_pct  && <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{beverage.alcohol_pct}%</span>}
                  {beverage.rating       && <span className="text-xs bg-zinc-800 text-amber-400 px-2 py-0.5 rounded-full">★ {beverage.rating}/10</span>}
                </div>
              </div>
            </div>

            {beverage.personal_note && (
              <p className="text-sm text-zinc-500 italic border-l-2 border-zinc-700 pl-3 mb-6">
                {beverage.personal_note}
              </p>
            )}

            {/* Stock por ubicación */}
            <section className="mb-6">
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Stock</h2>
              <div className="bg-zinc-900 rounded-xl overflow-hidden">
                {beverage.stock_by_location?.filter(s => s.quantity > 0).length === 0 ? (
                  <p className="px-4 py-3 text-sm text-zinc-600">Sin stock</p>
                ) : (
                  beverage.stock_by_location
                    ?.filter(s => s.quantity > 0)
                    .map((s) => (
                      <div key={s.inventory_id} className="flex justify-between items-center px-4 py-3 border-b border-zinc-800 last:border-0">
                        <span className="text-sm text-zinc-300">{s.location_name ?? 'Sin ubicación'}</span>
                        <span className="font-semibold text-zinc-100">{s.quantity}<span className="text-xs text-zinc-600 ml-1">u.</span></span>
                      </div>
                    ))
                )}
                <div className="flex justify-between items-center px-4 py-3 bg-zinc-800/50">
                  <span className="text-sm font-medium text-zinc-300">Total</span>
                  <span className="font-bold text-zinc-100">{beverage.total_stock}<span className="text-xs text-zinc-600 ml-1">u.</span></span>
                </div>
              </div>
            </section>

            {/* Acciones */}
            <div className="flex gap-2 mb-8">
              <button
                onClick={() => setShowMove(true)}
                className="flex-1 bg-zinc-100 text-zinc-900 font-medium rounded-lg py-2.5 text-sm hover:bg-white transition-colors"
              >
                + Movimiento
              </button>
              <button
                onClick={() => setShowEdit(true)}
                className="px-4 bg-zinc-800 text-zinc-300 rounded-lg py-2.5 text-sm hover:bg-zinc-700 transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => setConfirmDel(true)}
                className="px-4 bg-zinc-800 text-red-400 rounded-lg py-2.5 text-sm hover:bg-zinc-700 transition-colors"
              >
                Eliminar
              </button>
            </div>

            {/* Historial de movimientos */}
            <section>
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">Historial</h2>
              {movements.length === 0 ? (
                <p className="text-sm text-zinc-600 py-4">Sin movimientos registrados</p>
              ) : (
                <div className="space-y-1">
                  {movements.map((m) => {
                    const meta = MOVEMENT_LABELS[m.type] ?? { label: m.type, sign: '', color: 'text-zinc-400' }
                    const qty  = Math.abs(m.quantity)
                    return (
                      <div key={m.id} className="bg-zinc-900 rounded-xl px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
                              {m.location_name && (
                                <span className="text-xs text-zinc-600">· {m.location_name}</span>
                              )}
                              {m.occasion && (
                                <span className="text-xs text-zinc-600">· {m.occasion}</span>
                              )}
                            </div>
                            {m.notes && <p className="text-xs text-zinc-600 mt-1 truncate">{m.notes}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-semibold ${meta.color}`}>
                              {m.quantity > 0 ? '+' : ''}{m.quantity}
                            </p>
                            {m.price && (
                              <p className="text-xs text-zinc-600">${Number(m.price).toLocaleString('es-AR')}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-zinc-700 mt-1.5">
                          {new Date(m.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Modal editar */}
      {showEdit && beverage && (
        <BeverageForm
          initial={beverage}
          onSave={handleEdit}
          onClose={() => setShowEdit(false)}
          loading={saving}
        />
      )}

      {/* Modal movimiento */}
      {showMove && (
        <MovementForm
          beverageId={id}
          onSave={handleMovement}
          onClose={() => setShowMove(false)}
          loading={saving}
        />
      )}

      {/* Confirm delete */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDel(false)} />
          <div className="relative bg-zinc-900 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-zinc-100 mb-2">¿Eliminar bebida?</h3>
            <p className="text-sm text-zinc-500 mb-5">Esta acción no se puede deshacer. El historial de movimientos se conserva.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(false)} className="flex-1 bg-zinc-800 text-zinc-300 rounded-lg py-2.5 text-sm hover:bg-zinc-700 transition-colors">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 bg-red-900 text-red-200 rounded-lg py-2.5 text-sm hover:bg-red-800 transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
