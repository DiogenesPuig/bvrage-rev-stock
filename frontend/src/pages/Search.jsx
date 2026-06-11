import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import BeverageIcon from '../components/BeverageIcon'
import { api } from '../services/api'

const PAGE_SIZE = 20

const TYPE_FILTERS = [
  { value: '',        label: 'Todos' },
  { value: 'wine',    label: 'Vino' },
  { value: 'beer',    label: 'Cerveza' },
  { value: 'spirits', label: 'Destilado' },
  { value: 'other',   label: 'Otro' },
]

export default function Search() {
  const navigate = useNavigate()

  const [query,       setQuery]       = useState('')
  const [debouncedQ,  setDebouncedQ]  = useState('')
  const [typeFilter,  setTypeFilter]  = useState('')
  const [results,     setResults]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore,     setHasMore]     = useState(false)
  const [viewMode,    setViewMode]    = useState('grid')

  const sentinelRef = useRef(null)
  const fetchingRef = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 400)
    return () => clearTimeout(t)
  }, [query])

  const fetchPage = useCallback(async (offset) => {
    const params = new URLSearchParams({ limit: PAGE_SIZE, offset })
    if (typeFilter) params.set('type', typeFilter)
    if (debouncedQ) params.set('q', debouncedQ)
    const data = await api.get(`/beverages/catalog?${params}`)
    return data
  }, [typeFilter, debouncedQ])

  // Carga inicial y al cambiar filtro o búsqueda
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPage(0)
      .then(data => {
        if (cancelled) return
        setResults(data)
        setHasMore(data.length === PAGE_SIZE)
      })
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [fetchPage])

  // Infinite scroll: cargar más cuando el sentinel entra en viewport
  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !hasMore) return
    fetchingRef.current = true
    setLoadingMore(true)
    try {
      const data = await fetchPage(results.length)
      setResults(prev => prev.concat(data))
      setHasMore(data.length === PAGE_SIZE)
    } catch {
      setHasMore(false)
    } finally {
      fetchingRef.current = false
      setLoadingMore(false)
    }
  }, [fetchPage, results.length, hasMore])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      entries => entries[0].isIntersecting && loadMore(),
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore, hasMore])

  const handleSelect = (item) => {
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

  const handleCreateManual = () => {
    navigate('/collection', { state: { openForm: true } })
  }

  return (
    <Layout title="Buscar bebida">
      <div className="px-4 md:px-8 py-6 space-y-4 max-w-4xl">

        {/* Buscador + toggle de vista */}
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Nombre o productor..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
          />
          <button
            onClick={() => setViewMode(m => m === 'grid' ? 'list' : 'grid')}
            title={viewMode === 'grid' ? 'Cambiar a lista' : 'Cambiar a grilla'}
            className="shrink-0 w-10 h-10 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
          >
            {viewMode === 'grid' ? <ListIcon /> : <GridIcon />}
          </button>
        </div>

        {/* Filtro por tipo */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typeFilter === f.value
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Resultados */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-zinc-500">
              {debouncedQ ? `Sin resultados para "${debouncedQ}"` : 'No hay bebidas en esta categoría'}
            </p>
            <button
              onClick={handleCreateManual}
              className="text-sm text-zinc-300 underline underline-offset-4 hover:text-white transition-colors"
            >
              Crear bebida manualmente
            </button>
          </div>
        )}

        {!loading && results.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {results.map((item) => (
                  <ResultGridCard key={item.id} item={item} onSelect={() => handleSelect(item)} />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((item) => (
                  <ResultListCard key={item.id} item={item} onSelect={() => handleSelect(item)} />
                ))}
              </div>
            )}

            {/* Sentinel del infinite scroll */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-6">
                {loadingMore && (
                  <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
                )}
              </div>
            )}

            <div className="pt-2 text-center">
              <button
                onClick={handleCreateManual}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                ¿No encontraste lo que buscabas? Crear manualmente
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

function ResultGridCard({ item, onSelect }) {
  return (
    <button
      onClick={onSelect}
      className="bg-zinc-900 rounded-xl p-3 flex flex-col items-center gap-2 text-left hover:bg-zinc-800 transition-colors border border-zinc-800 hover:border-zinc-700"
    >
      <BeverageIcon
        type={item.type}
        grape_variety={item.grape_variety}
        image_url={item.image_url}
        size={60}
      />
      <div className="w-full text-center">
        <p className="text-sm font-medium text-zinc-100 leading-tight line-clamp-2">{item.name}</p>
        {(item.producer || item.country) && (
          <p className="text-xs text-zinc-600 mt-0.5 truncate">
            {[item.producer, item.country].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between w-full mt-auto pt-1 border-t border-zinc-800">
        {item.vivino_rating
          ? <span className="text-xs text-amber-400">★ {Number(item.vivino_rating).toFixed(1)}</span>
          : <span />}
        <span className="text-xs font-medium text-zinc-300">+ Agregar</span>
      </div>
    </button>
  )
}

function ResultListCard({ item, onSelect }) {
  return (
    <div className="bg-zinc-900 rounded-xl p-3 flex gap-3 items-center border border-zinc-800 hover:border-zinc-700 transition-colors">
      <BeverageIcon
        type={item.type}
        grape_variety={item.grape_variety}
        image_url={item.image_url}
        size={52}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-zinc-100 truncate">{item.name}</p>
          {item.vivino_rating && (
            <span className="text-xs text-amber-400 shrink-0">
              ★ {Number(item.vivino_rating).toFixed(1)}
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500 truncate mt-0.5">
          {[item.producer, item.country, item.region].filter(Boolean).join(' · ')}
        </p>
        {item.grape_variety && (
          <p className="text-xs text-zinc-600 mt-0.5 truncate">{item.grape_variety}</p>
        )}
      </div>

      <button
        onClick={onSelect}
        className="shrink-0 px-3 py-1.5 bg-zinc-100 text-zinc-900 rounded-lg text-xs font-medium hover:bg-white transition-colors"
      >
        + Agregar
      </button>
    </div>
  )
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="3" cy="6" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="3" cy="18" r="1" fill="currentColor"/>
    </svg>
  )
}
