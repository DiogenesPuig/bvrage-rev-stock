import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import BeverageCard from '../components/BeverageCard'
import BeverageIcon from '../components/BeverageIcon'
import BeverageForm from '../components/BeverageForm'
import LocationsPanel from '../components/LocationsPanel'
import { api } from '../services/api'

const TYPES = ['wine', 'beer', 'spirits', 'other']
const TYPE_LABELS = { wine: 'Vino', beer: 'Cerveza', spirits: 'Destilado', other: 'Otro' }
const GRID_THRESHOLD = 12

export default function Collection() {
  const location = useLocation()
  const navigate  = useNavigate()

  const [tab,           setTab]         = useState('bebidas')
  const [beverages,    setBeverages]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [search,       setSearch]       = useState('')
  const [typeFilter,   setTypeFilter]   = useState('')
  const [showForm,     setShowForm]     = useState(false)
  const [prefillData,  setPrefillData]  = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [viewMode,     setViewMode]     = useState(
    () => localStorage.getItem('bodega-view') || 'auto'
  )

  // Recibe prefill o apertura directa del form desde búsqueda
  useEffect(() => {
    if (location.state?.prefill) {
      setPrefillData(location.state.prefill)
      setShowForm(true)
      navigate('/collection', { replace: true, state: {} })
    } else if (location.state?.openForm) {
      setShowForm(true)
      navigate('/collection', { replace: true, state: {} })
    }
  }, [location.state, navigate])

  const fetchBeverages = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search)     params.set('search', search)
      if (typeFilter) params.set('type', typeFilter)
      setBeverages(await api.get(`/beverages?${params}`))
    } catch {
      setError('No se pudo cargar la bodega')
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter])

  useEffect(() => {
    const id = setTimeout(fetchBeverages, search ? 300 : 0)
    return () => clearTimeout(id)
  }, [fetchBeverages, search])

  const toggleView = () => {
    const next = effectiveMode === 'grid' ? 'list' : 'grid'
    setViewMode(next)
    localStorage.setItem('bodega-view', next)
  }

  const handleAdd = async (formData) => {
    const { initial_location_id, initial_quantity, ...beverageData } = formData
    setSaving(true)
    try {
      const beverage = await api.post('/beverages', beverageData)
      if (initial_quantity > 0) {
        await api.post('/movements', {
          beverage_id: beverage.id,
          location_id: initial_location_id,
          type: 'purchase',
          quantity: initial_quantity,
        })
      }
      setShowForm(false)
      fetchBeverages()
    } catch (err) {
      alert(err?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const effectiveMode = viewMode === 'auto'
    ? (beverages.length > GRID_THRESHOLD ? 'list' : 'grid')
    : viewMode

  const totalBottles = beverages.reduce((sum, b) => sum + (b.total_stock || 0), 0)

  return (
    <Layout title="Mi Bodega">
      <div className="px-4 md:px-8 pt-4">
        <div className="flex gap-2 border-b border-border-soft">
          <TabButton active={tab === 'bebidas'} onClick={() => setTab('bebidas')}>Bebidas</TabButton>
          <TabButton active={tab === 'ubicaciones'} onClick={() => setTab('ubicaciones')}>Ubicaciones</TabButton>
        </div>
      </div>

      {tab === 'ubicaciones' ? (
        <LocationsPanel />
      ) : (
        <>
          <div className="px-4 md:px-8 pt-4 pb-2 space-y-3">
            <div className="flex gap-2">
              <input
                type="search"
                placeholder="Buscar por nombre o productor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="field flex-1 rounded-xl px-4 py-2.5"
              />
              <button
                onClick={toggleView}
                title={effectiveMode === 'grid' ? 'Cambiar a lista' : 'Cambiar a grilla'}
                className="shrink-0 w-10 h-10 flex items-center justify-center bg-surface border border-border rounded-xl text-ink-soft hover:text-gold hover:border-gold/40 transition-colors"
              >
                {effectiveMode === 'grid' ? <ListIcon /> : <GridIcon />}
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              <FilterChip active={!typeFilter} onClick={() => setTypeFilter('')}>Todos</FilterChip>
              {TYPES.map((t) => (
                <FilterChip key={t} active={typeFilter === t} onClick={() => setTypeFilter(t === typeFilter ? '' : t)}>
                  {TYPE_LABELS[t]}
                </FilterChip>
              ))}
            </div>
          </div>

          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-border border-t-gold rounded-full animate-spin" />
            </div>
          )}

          {error && <p className="text-center text-sm text-red-400 py-8">{error}</p>}

          {!loading && !error && (
            <>
              {beverages.length > 0 && (
                <p className="px-4 md:px-8 py-2 text-xs text-muted">
                  {beverages.length} {beverages.length === 1 ? 'bebida' : 'bebidas'} · {totalBottles} {totalBottles === 1 ? 'botella' : 'botellas'}
                </p>
              )}

              {effectiveMode === 'grid' ? (
                <div className="px-4 md:px-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {beverages.map((b) => <BeverageGridCard key={b.id} beverage={b} />)}
                </div>
              ) : (
                <div className="md:px-4">
                  {beverages.map((b) => <BeverageCard key={b.id} beverage={b} />)}
                </div>
              )}

              {beverages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                  <p className="text-ink-soft font-medium mb-1">
                    {search || typeFilter ? 'Sin resultados' : 'Tu bodega está vacía'}
                  </p>
                  <p className="text-sm text-muted">
                    {search || typeFilter ? 'Probá con otros filtros' : 'Agregá tu primera bebida con el botón +'}
                  </p>
                </div>
              )}
            </>
          )}

          <button
            onClick={() => setShowForm(true)}
            className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-gold text-[#402d00] rounded-full shadow-lg flex items-center justify-center text-2xl font-light hover:bg-gold-hover transition-colors z-20"
            aria-label="Agregar bebida"
          >
            +
          </button>

          {showForm && (
            <BeverageForm
              initial={prefillData}
              onSave={handleAdd}
              onClose={() => { setShowForm(false); setPrefillData(null) }}
              loading={saving}
            />
          )}
        </>
      )}
    </Layout>
  )
}

function BeverageGridCard({ beverage }) {
  const { id, name, producer, vintage, type, grape_variety, image_url, total_stock } = beverage
  return (
    <Link
      to={`/beverages/${id}`}
      className="card p-3 flex flex-col items-center gap-2 hover:border-gold/30 transition-colors"
    >
      <BeverageIcon type={type} grape_variety={grape_variety} image_url={image_url} size={60} />
      <div className="w-full text-center">
        <p className="text-sm font-medium text-ink leading-tight line-clamp-2">{name}</p>
        {(producer || vintage) && (
          <p className="text-xs text-muted mt-0.5 truncate">
            {[producer, vintage].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between w-full mt-auto pt-1 border-t border-border-soft">
        <span className="text-xs text-muted">{TYPE_LABELS[type] ?? type}</span>
        <span className="font-serif text-gold text-sm">
          {total_stock}<span className="text-xs text-muted font-sans ml-0.5">u.</span>
        </span>
      </div>
    </Link>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-1 pb-3 text-sm border-b-2 -mb-px transition-colors ${
        active ? 'border-gold text-gold font-medium' : 'border-transparent text-ink-soft hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1 rounded-full text-sm transition-colors ${
        active ? 'bg-gold text-[#402d00] font-medium' : 'bg-chip text-ink-soft hover:text-ink'
      }`}
    >
      {children}
    </button>
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
