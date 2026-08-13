import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../services/api'

const PAGE_SIZE = 30

const TYPE_META = {
  purchase:    { label: 'Compra',        verb: 'Agregaste',    color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  consumption: { label: 'Consumo',       verb: 'Consumiste',   color: 'text-red-400',     bg: 'bg-red-400/10' },
  transfer:    { label: 'Transferencia', verb: 'Transferiste', color: 'text-blue-400',    bg: 'bg-blue-400/10' },
}

const TYPE_FILTERS = [
  { value: '',             label: 'Todos' },
  { value: 'purchase',     label: 'Compra' },
  { value: 'consumption',  label: 'Consumo' },
  { value: 'transfer',     label: 'Transferencia' },
]

function dateBucket(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a, b) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return 'Hoy'
  if (sameDay(d, yesterday)) return 'Ayer'
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Activity() {
  const [typeFilter,   setTypeFilter]   = useState('')
  const [movements,    setMovements]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [loadingMore,  setLoadingMore]  = useState(false)
  const [hasMore,      setHasMore]      = useState(false)
  const [error,        setError]        = useState('')

  const fetchingRef = useRef(false)

  const fetchPage = useCallback(async (offset) => {
    const params = new URLSearchParams({ limit: PAGE_SIZE, offset })
    if (typeFilter) params.set('type', typeFilter)
    return api.get(`/movements?${params}`)
  }, [typeFilter])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchPage(0)
      .then((data) => {
        if (cancelled) return
        setMovements(data)
        setHasMore(data.length === PAGE_SIZE)
      })
      .catch(() => !cancelled && setError('No se pudo cargar el historial'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !hasMore) return
    fetchingRef.current = true
    setLoadingMore(true)
    try {
      const data = await fetchPage(movements.length)
      setMovements((prev) => prev.concat(data))
      setHasMore(data.length === PAGE_SIZE)
    } catch {
      setHasMore(false)
    } finally {
      fetchingRef.current = false
      setLoadingMore(false)
    }
  }, [fetchPage, movements.length, hasMore])

  useEffect(() => {
    if (!hasMore) return
    const checkScroll = () => {
      const scrollBottom = window.scrollY + window.innerHeight
      if (scrollBottom >= document.documentElement.scrollHeight - 400) loadMore()
    }
    window.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      window.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [loadMore, hasMore])

  // Agrupar por fecha manteniendo el orden ya ordenado por el backend
  const groups = []
  for (const m of movements) {
    const bucket = dateBucket(m.date)
    const last = groups[groups.length - 1]
    if (last && last.bucket === bucket) {
      last.items.push(m)
    } else {
      groups.push({ bucket, items: [m] })
    }
  }

  return (
    <Layout title="Actividad">
      <div className="px-4 md:px-8 py-6 max-w-2xl">

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar mb-6">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typeFilter === f.value
                  ? 'bg-gold text-[#402d00]'
                  : 'bg-chip text-ink-soft hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-border border-t-gold rounded-full animate-spin" />
          </div>
        )}

        {error && <p className="text-sm text-red-400 py-8 text-center">{error}</p>}

        {!loading && !error && movements.length === 0 && (
          <div className="text-center py-20">
            <p className="text-ink-soft font-medium mb-1">Sin actividad todavía</p>
            <p className="text-sm text-muted">Los movimientos de tu bodega van a aparecer acá</p>
          </div>
        )}

        {!loading && groups.map((group) => (
          <section key={group.bucket} className="mb-6">
            <p className="label-caps mb-3">{group.bucket}</p>
            <div className="space-y-2">
              {group.items.map((m) => {
                const meta = TYPE_META[m.type] ?? { label: m.type, verb: m.type, color: 'text-ink-soft', bg: 'bg-chip' }
                const qty = Math.abs(m.quantity)
                return (
                  <Link
                    key={m.id}
                    to={`/beverages/${m.beverage_id}`}
                    className="card px-4 py-3.5 flex items-center gap-4 hover:border-gold/30 transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-full ${meta.bg} flex items-center justify-center shrink-0`}>
                      <MovementIcon type={m.type} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className={`font-medium ${meta.color}`}>{meta.verb}</span>{' '}
                        <span className="text-ink-soft">{qty}x</span>{' '}
                        <span className="font-serif italic">{m.beverage_name}</span>
                      </p>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        {[m.location_name, m.occasion, m.notes].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <span className="text-xs text-muted shrink-0">
                      {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}

        {hasMore && (
          <div className="flex justify-center py-6">
            {loadingMore && (
              <div className="w-5 h-5 border-2 border-border border-t-gold rounded-full animate-spin" />
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}

function MovementIcon({ type, className }) {
  if (type === 'purchase') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>
      </svg>
    )
  }
  if (type === 'consumption') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 3h14l-2.5 8a6 6 0 0 1-9 0L5 3z"/>
        <line x1="12" y1="17" x2="12" y2="21"/><line x1="8.5" y1="21" x2="15.5" y2="21"/>
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
      <path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
    </svg>
  )
}
