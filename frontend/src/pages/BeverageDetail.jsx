import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import BeverageIcon from '../components/BeverageIcon'
import BeverageForm from '../components/BeverageForm'
import MovementForm from '../components/MovementForm'
import ReviewForm from '../components/ReviewForm'
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
  const [reviews,    setReviews]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [showEdit,   setShowEdit]   = useState(false)
  const [showMove,   setShowMove]   = useState(false)
  const [showReview, setShowReview] = useState(false)
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

  // Reseñas públicas de la comunidad que matcheen esta bebida por nombre.
  useEffect(() => {
    if (!beverage?.name) return
    api.get(`/reviews?q=${encodeURIComponent(beverage.name)}`)
      .then(setReviews)
      .catch(() => {})
  }, [beverage?.name])

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

  const handleReview = async (formData) => {
    setSaving(true)
    try {
      await api.post('/reviews', formData)
      setShowReview(false)
    } catch (err) {
      alert(err?.error || 'Error al publicar reseña')
    } finally {
      setSaving(false)
    }
  }

  const handleMovement = async (formData) => {
    setSaving(true)
    try {
      await api.post('/movements', formData)
      setShowMove(false)
      fetchData()
    } catch (err) {
      const msg = err?.available != null
        ? `${err.error} (disponible: ${err.available})`
        : err?.error || 'Error al registrar movimiento'
      alert(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto md:max-w-3xl px-4 md:px-8 py-6">

        {/* Back */}
        <button
          onClick={() => navigate('/collection')}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-ink-soft transition-colors mb-5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Mi Bodega
        </button>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-border border-t-gold rounded-full animate-spin" />
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
                <h1 className="font-serif text-xl leading-tight">{beverage.name}</h1>
                <p className="text-muted text-sm mt-0.5">
                  {[beverage.producer, beverage.country, beverage.region].filter(Boolean).join(' · ')}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs bg-chip text-ink-soft px-2 py-0.5 rounded-full">{TYPE_LABELS[beverage.type] ?? beverage.type}</span>
                  {beverage.vintage     && <span className="text-xs bg-chip text-ink-soft px-2 py-0.5 rounded-full">{beverage.vintage}</span>}
                  {beverage.grape_variety && <span className="text-xs bg-chip text-ink-soft px-2 py-0.5 rounded-full">{beverage.grape_variety}</span>}
                  {beverage.alcohol_pct  && <span className="text-xs bg-chip text-ink-soft px-2 py-0.5 rounded-full">{beverage.alcohol_pct}%</span>}
                  {beverage.rating       && <span className="text-xs bg-chip text-gold px-2 py-0.5 rounded-full">★ {beverage.rating}/10</span>}
                </div>
              </div>
            </div>

            {beverage.personal_note && (
              <p className="text-sm text-ink-soft italic border-l-2 border-gold/30 pl-3 mb-6">
                {beverage.personal_note}
              </p>
            )}

            {/* Stock por ubicación */}
            <section className="mb-6">
              <h2 className="label-caps mb-3">Stock</h2>
              <div className="card overflow-hidden">
                {beverage.stock_by_location?.filter(s => s.quantity > 0).length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted">Sin stock</p>
                ) : (
                  beverage.stock_by_location
                    ?.filter(s => s.quantity > 0)
                    .map((s) => (
                      <div key={s.inventory_id} className="flex justify-between items-center px-4 py-3 border-b border-border-soft last:border-0">
                        <span className="text-sm text-ink-soft">{s.location_name ?? 'Sin ubicación'}</span>
                        <span className="font-serif text-ink">{s.quantity}<span className="text-xs text-muted font-sans ml-1">u.</span></span>
                      </div>
                    ))
                )}
                <div className="flex justify-between items-center px-4 py-3 bg-canvas-deep/50">
                  <span className="text-sm font-medium text-ink-soft">Total</span>
                  <span className="font-serif text-gold">{beverage.total_stock}<span className="text-xs text-muted font-sans ml-1">u.</span></span>
                </div>
              </div>
            </section>

            {/* Acciones */}
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => setShowMove(true)}
                className="flex-1 bg-gold text-[#402d00] font-medium rounded-lg py-2.5 text-sm hover:bg-gold-hover transition-colors"
              >
                + Movimiento
              </button>
              <button
                onClick={() => setShowReview(true)}
                className="flex-1 bg-chip text-ink-soft rounded-lg py-2.5 text-sm hover:text-ink transition-colors"
              >
                ★ Reseñar
              </button>
              <button
                onClick={() => setShowEdit(true)}
                className="px-4 bg-chip text-ink-soft rounded-lg py-2.5 text-sm hover:text-ink transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => setConfirmDel(true)}
                className="px-4 bg-chip text-red-400 rounded-lg py-2.5 text-sm hover:bg-red-950/40 transition-colors"
              >
                Eliminar
              </button>
            </div>

            {/* Historial de movimientos */}
            <section>
              <h2 className="label-caps mb-3">Historial</h2>
              {movements.length === 0 ? (
                <p className="text-sm text-muted py-4">Sin movimientos registrados</p>
              ) : (
                <div className="space-y-1">
                  {movements.map((m) => {
                    const meta = MOVEMENT_LABELS[m.type] ?? { label: m.type, sign: '', color: 'text-ink-soft' }
                    const qty  = Math.abs(m.quantity)
                    return (
                      <div key={m.id} className="card px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-medium ${meta.color}`}>{meta.label}</span>
                              {m.location_name && (
                                <span className="text-xs text-muted">· {m.location_name}</span>
                              )}
                              {m.occasion && (
                                <span className="text-xs text-muted">· {m.occasion}</span>
                              )}
                            </div>
                            {m.notes && <p className="text-xs text-muted mt-1 truncate">{m.notes}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-semibold ${meta.color}`}>
                              {m.quantity > 0 ? '+' : ''}{m.quantity}
                            </p>
                            {m.price && (
                              <p className="text-xs text-muted">${Number(m.price).toLocaleString('es-AR')}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted/70 mt-1.5">
                          {new Date(m.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Reseñas de la comunidad */}
            {reviews.length > 0 && (
              <section className="mt-8">
                <h2 className="label-caps mb-3">Reseñas de la comunidad</h2>
                <div className="space-y-2">
                  {reviews.map((r) => (
                    <div key={r.id} className="card px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted">
                          {r.author_name ?? 'Anónimo'} · {new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {r.rating != null && (
                          <span className="font-serif text-gold shrink-0">
                            ★ {r.rating}<span className="text-xs text-muted font-sans">/10</span>
                          </span>
                        )}
                      </div>
                      {r.body && <p className="text-sm text-ink-soft mt-1.5 leading-relaxed">{r.body}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
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

      {/* Modal reseña */}
      {showReview && beverage && (
        <ReviewForm
          beverageRef={[beverage.name, beverage.producer, beverage.vintage].filter(Boolean).join(' ')}
          onSave={handleReview}
          onClose={() => setShowReview(false)}
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
          <div className="relative bg-surface border-t border-t-gold/15 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-serif text-gold text-lg mb-2">¿Eliminar bebida?</h3>
            <p className="text-sm text-ink-soft mb-5">Esta acción no se puede deshacer. El historial de movimientos se conserva.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(false)} className="flex-1 bg-chip text-ink-soft rounded-lg py-2.5 text-sm hover:text-ink transition-colors">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 bg-red-900 text-red-200 rounded-lg py-2.5 text-sm hover:bg-red-800 transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
