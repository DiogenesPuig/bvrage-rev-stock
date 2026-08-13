import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import Layout from '../components/Layout'
import BeverageIcon from '../components/BeverageIcon'

const PAGE_SIZE = 20

const TYPE_FILTERS = [
  { value: '',        label: 'Todos' },
  { value: 'wine',    label: 'Vino' },
  { value: 'beer',    label: 'Cerveza' },
  { value: 'spirits', label: 'Destilado' },
  { value: 'other',   label: 'Otro' },
]

// Heurística simple: matchea por texto libre hasta que las reseñas
// tengan un vínculo real al catálogo (beverage_ref hoy no es FK).
function matchReview(item, reviews) {
  if (!item?.name) return null
  const name = item.name.toLowerCase()
  return reviews.find((r) => {
    const ref = (r.beverage_ref || '').toLowerCase()
    return ref && (ref.includes(name) || name.includes(ref))
  }) || null
}

export default function Home() {
  const { user } = useAuth()
  return user ? <Community /> : <HomePublic />
}

// ─── Vista pública ────────────────────────────────────────────────────────────

function HomePublic() {
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/reviews/featured')
      .then(setFeatured)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border-soft">
        <span className="font-serif text-gold text-lg">CaveBin</span>
        <div className="flex items-center gap-3">
          <Link to="/login"    className="text-sm text-ink-soft hover:text-ink transition-colors">Iniciar sesión</Link>
          <Link to="/register" className="text-xs uppercase tracking-widest bg-gold text-[#402d00] px-4 py-2 font-medium hover:bg-gold-hover transition-colors">Registrarse</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl mb-2">Descubrí bebidas</h1>
          <p className="text-ink-soft">Las más reseñadas por la comunidad</p>
        </div>

        {loading && <Spinner />}

        {!loading && featured.length === 0 && (
          <div className="text-center py-20">
            <p className="text-ink-soft mb-1">Todavía no hay reseñas</p>
            <p className="text-sm text-muted">
              <Link to="/register" className="text-gold hover:text-gold-hover">Registrate</Link> y sé el primero en dejar una
            </p>
          </div>
        )}

        <div className="space-y-1">
          {featured.map((item) => (
            <FeaturedCard key={item.beverage_ref} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FeaturedCard({ item }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 rounded-lg hover:bg-surface transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink truncate">{item.beverage_ref}</p>
        {item.latest_body && (
          <p className="text-sm text-muted truncate mt-0.5">"{item.latest_body}"</p>
        )}
      </div>
      <div className="shrink-0 text-right space-y-0.5">
        {item.avg_rating != null && (
          <p className="font-serif text-gold">{item.avg_rating}<span className="text-xs text-muted font-sans">/10</span></p>
        )}
        <p className="text-xs text-muted">{item.review_count} {item.review_count === 1 ? 'reseña' : 'reseñas'}</p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="w-5 h-5 border-2 border-border border-t-gold rounded-full animate-spin" />
    </div>
  )
}

// ─── Vista logueada: catálogo + comunidad ─────────────────────────────────────

function Community() {
  const navigate = useNavigate()

  const [query,       setQuery]       = useState('')
  const [debouncedQ,  setDebouncedQ]  = useState('')
  const [typeFilter,  setTypeFilter]  = useState('')
  const [viewMode,    setViewMode]    = useState('grid')

  const [browseResults, setBrowseResults] = useState([])
  const [searchResults, setSearchResults] = useState(null) // null = sin búsqueda activa
  const [loading,       setLoading]       = useState(true)
  const [loadingMore,   setLoadingMore]   = useState(false)
  const [hasMore,       setHasMore]       = useState(false)

  const [featuredReviews, setFeaturedReviews] = useState([])

  const fetchingRef = useRef(false)

  useEffect(() => {
    api.get('/reviews/featured').then(setFeaturedReviews).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 400)
    return () => clearTimeout(t)
  }, [query])

  const fetchPage = useCallback(async (offset, q) => {
    const params = new URLSearchParams({ limit: PAGE_SIZE, offset })
    if (typeFilter) params.set('type', typeFilter)
    if (q) params.set('q', q)
    return api.get(`/beverages/catalog?${params}`)
  }, [typeFilter])

  // Catálogo destacado por defecto (sin búsqueda) — ya viene ordenado
  // por relevancia/rating desde el backend.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPage(0, '')
      .then((data) => {
        if (cancelled) return
        setBrowseResults(data)
      })
      .catch(() => !cancelled && setBrowseResults([]))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [fetchPage])

  // Búsqueda en vivo
  useEffect(() => {
    if (!debouncedQ) { setSearchResults(null); return }
    let cancelled = false
    fetchPage(0, debouncedQ)
      .then((data) => !cancelled && setSearchResults(data))
      .catch(() => !cancelled && setSearchResults([]))
    return () => { cancelled = true }
  }, [debouncedQ, fetchPage])

  const isSearching  = Boolean(debouncedQ)
  const hasMatches   = isSearching && searchResults && searchResults.length > 0
  const noMatch      = isSearching && searchResults && searchResults.length === 0
  const displayed    = hasMatches ? searchResults : browseResults

  useEffect(() => {
    setHasMore(displayed.length > 0 && displayed.length % PAGE_SIZE === 0)
  }, [displayed])

  const loadMore = useCallback(async () => {
    if (fetchingRef.current || !hasMore) return
    fetchingRef.current = true
    setLoadingMore(true)
    try {
      const data = await fetchPage(displayed.length, hasMatches ? debouncedQ : '')
      if (hasMatches) {
        setSearchResults((prev) => prev.concat(data))
      } else {
        setBrowseResults((prev) => prev.concat(data))
      }
      if (data.length < PAGE_SIZE) setHasMore(false)
    } catch {
      setHasMore(false)
    } finally {
      fetchingRef.current = false
      setLoadingMore(false)
    }
  }, [fetchPage, displayed.length, hasMatches, debouncedQ, hasMore])

  useEffect(() => {
    if (!hasMore) return
    const checkScroll = () => {
      const scrollBottom = window.scrollY + window.innerHeight
      if (scrollBottom >= document.documentElement.scrollHeight - 400) loadMore()
    }
    checkScroll() // por si la página ya carga con poco contenido y no hace falta scrollear
    window.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => {
      window.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
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
    <Layout title="Comunidad">
      <div className="px-4 md:px-8 py-6 space-y-4">

        {/* Buscador + toggle de vista */}
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar una bebida..."
            className="field flex-1 rounded-xl px-4 py-2.5"
          />
          <button
            onClick={() => setViewMode((m) => m === 'grid' ? 'list' : 'grid')}
            title={viewMode === 'grid' ? 'Cambiar a lista' : 'Cambiar a grilla'}
            className="shrink-0 w-10 h-10 flex items-center justify-center bg-surface border border-border rounded-xl text-ink-soft hover:text-gold hover:border-gold/40 transition-colors"
          >
            {viewMode === 'grid' ? <ListIcon /> : <GridIcon />}
          </button>
        </div>

        {/* Filtro por tipo */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
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

        {/* Mensaje no invasivo de sin coincidencias — la comunidad sigue abajo */}
        {noMatch && (
          <p className="text-xs text-muted italic">
            Sin resultados para "{debouncedQ}" · mostrando lo destacado de la comunidad
          </p>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-border border-t-gold rounded-full animate-spin" />
          </div>
        )}

        {!loading && displayed.length === 0 && (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-muted">Todavía no hay bebidas en el catálogo</p>
            <button
              onClick={handleCreateManual}
              className="text-sm text-gold underline underline-offset-4 hover:text-gold-hover transition-colors"
            >
              Crear bebida manualmente
            </button>
          </div>
        )}

        {!loading && displayed.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {displayed.map((item) => (
                  <ResultGridCard
                    key={item.id}
                    item={item}
                    review={matchReview(item, featuredReviews)}
                    onSelect={() => handleSelect(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {displayed.map((item) => (
                  <ResultListCard
                    key={item.id}
                    item={item}
                    review={matchReview(item, featuredReviews)}
                    onSelect={() => handleSelect(item)}
                  />
                ))}
              </div>
            )}

            {hasMore && (
              <div className="flex justify-center py-6">
                {loadingMore && (
                  <div className="w-5 h-5 border-2 border-border border-t-gold rounded-full animate-spin" />
                )}
              </div>
            )}

            <div className="pt-2 text-center">
              <button
                onClick={handleCreateManual}
                className="text-xs text-muted hover:text-ink-soft transition-colors"
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

function ResultGridCard({ item, review, onSelect }) {
  const navigate = useNavigate()

  const handleAddClick = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onSelect()
  }

  return (
    <div
      onClick={() => navigate(`/catalog/${item.id}`)}
      className="card overflow-hidden flex flex-col cursor-pointer hover:border-gold/30 transition-colors"
    >
      <div className="relative w-full aspect-[3/4] bg-canvas-deep overflow-hidden flex items-center justify-center">
        {item.image_url ? (
          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <BeverageIcon type={item.type} grape_variety={item.grape_variety} size={64} />
        )}
        {item.vivino_rating && (
          <span className="absolute top-2 right-2 bg-chip backdrop-blur-sm text-gold text-xs px-2 py-0.5 rounded-full">
            ★ {Number(item.vivino_rating).toFixed(1)}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <p className="text-sm font-medium text-ink leading-tight line-clamp-2">{item.name}</p>
        {(item.producer || item.country) && (
          <p className="text-xs text-muted mt-0.5 truncate">
            {[item.producer, item.country].filter(Boolean).join(' · ')}
          </p>
        )}
        {review?.latest_body && (
          <p className="text-[10px] text-muted italic mt-1 line-clamp-1">"{review.latest_body}"</p>
        )}

        <button
          onClick={handleAddClick}
          className="mt-2 w-full text-xs font-medium text-ink-soft border border-border rounded-lg py-1.5 hover:text-gold hover:border-gold/40 transition-colors"
        >
          + Agregar
        </button>
      </div>
    </div>
  )
}

function ResultListCard({ item, review, onSelect }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/catalog/${item.id}`)}
      className="card p-3 flex gap-3 items-center cursor-pointer hover:border-gold/30 transition-colors"
    >
      <div className="relative w-16 h-20 shrink-0 bg-canvas-deep rounded-md overflow-hidden flex items-center justify-center">
        {item.image_url ? (
          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <BeverageIcon type={item.type} grape_variety={item.grape_variety} size={40} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-ink truncate">{item.name}</p>
          {item.vivino_rating && (
            <span className="text-xs text-gold shrink-0">
              ★ {Number(item.vivino_rating).toFixed(1)}
            </span>
          )}
        </div>
        <p className="text-sm text-muted truncate mt-0.5">
          {[item.producer, item.country, item.region].filter(Boolean).join(' · ')}
        </p>
        {review?.latest_body ? (
          <p className="text-[10px] text-muted italic mt-0.5 line-clamp-1">"{review.latest_body}"</p>
        ) : item.grape_variety && (
          <p className="text-xs text-muted mt-0.5 truncate">{item.grape_variety}</p>
        )}
      </div>

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect() }}
        className="shrink-0 px-3 py-1.5 bg-gold text-[#402d00] rounded-lg text-xs font-medium hover:bg-gold-hover transition-colors"
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
