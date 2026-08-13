import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import BeverageIcon from '../components/BeverageIcon'
import { api } from '../services/api'

const TYPE_LABELS = { wine: 'Vino', beer: 'Cerveza', spirits: 'Destilado', other: 'Otro' }

export default function CatalogDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [item,    setItem]    = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItem(await api.get(`/beverages/catalog/${id}`))
    } catch {
      setError('No se pudo cargar la bebida')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!item?.name) return
    api.get(`/reviews?q=${encodeURIComponent(item.name)}`)
      .then(setReviews)
      .catch(() => {})
  }, [item?.name])

  const handleAdd = () => {
    const prefill = {
      name:          item.name          || '',
      producer:      item.producer      || '',
      type:          item.type          || 'wine',
      country:       item.country       || '',
      region:        item.region        || '',
      grape_variety: item.grape_variety || '',
      alcohol_pct:   item.alcohol_pct   || '',
      image_url:     item.image_url     || '',
      external_url:  item.external_url  || '',
    }
    navigate('/collection', { state: { prefill } })
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-ink-soft transition-colors mb-5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          Comunidad
        </button>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-border border-t-gold rounded-full animate-spin" />
          </div>
        )}

        {error && <p className="text-red-400 text-sm py-8 text-center">{error}</p>}

        {item && (
          <>
            <div className="grid sm:grid-cols-[minmax(0,280px)_1fr] gap-6 mb-8">
              <div className="relative w-full aspect-[3/4] bg-canvas-deep border-t border-t-gold/15 border border-border-soft rounded-lg overflow-hidden flex items-center justify-center">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-4" />
                ) : (
                  <BeverageIcon type={item.type} grape_variety={item.grape_variety} size={96} />
                )}
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <span className="label-caps text-gold">{TYPE_LABELS[item.type] ?? item.type}</span>
                  <h1 className="font-serif text-2xl md:text-3xl leading-tight mt-1">{item.name}</h1>
                  <p className="text-ink-soft text-sm mt-1">
                    {[item.producer, item.country, item.region].filter(Boolean).join(' · ')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.grape_variety && <span className="text-xs bg-chip text-ink-soft px-2 py-0.5 rounded-full">{item.grape_variety}</span>}
                  {item.vivino_rating && (
                    <span className="text-xs bg-chip text-gold px-2 py-0.5 rounded-full">
                      ★ {Number(item.vivino_rating).toFixed(1)} ({item.vivino_ratings_count})
                    </span>
                  )}
                </div>

                <button
                  onClick={handleAdd}
                  className="btn-primary rounded-lg mt-2 sm:w-auto sm:px-8"
                >
                  + Agregar a mi bodega
                </button>
              </div>
            </div>

            {reviews.length > 0 && (
              <section>
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
    </Layout>
  )
}
