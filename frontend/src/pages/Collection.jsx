import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import BeverageCard from '../components/BeverageCard'
import BeverageIcon from '../components/BeverageIcon'
import BeverageForm from '../components/BeverageForm'
import { api } from '../services/api'

const TYPES = ['wine', 'beer', 'spirits', 'other']
const TYPE_LABELS = { wine: 'Vino', beer: 'Cerveza', spirits: 'Destilado', other: 'Otro' }
const GRID_THRESHOLD = 12

export default function Collection() {
  const location = useLocation()
  const navigate  = useNavigate()

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
    setSaving(true)
    try {
      await api.post('/beverages', formData)
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
      <div className="px-4 md:px-8 pt-4 pb-2 space-y-3 max-w-4xl">
        <div className="flex gap-2">
          <input
            type="search"
            placeholder="Buscar por nombre o productor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
          />
          <button
            onClick={toggleView}
            title={effectiveMode === 'grid' ? 'Cambiar a lista' : 'Cambiar a grilla'}
            className="shrink-0 w-10 h-10 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
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
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
        </div>
      )}

      {error && <p className="text-center text-sm text-red-400 py-8">{error}</p>}

      {!loading && !error && (
        <>
          {beverages.length > 0 && (
            <p className="px-4 md:px-8 py-2 text-xs text-zinc-600">
              {beverages.length} {beverages.length === 1 ? 'bebida' : 'bebidas'} · {totalBottles} {totalBottles === 1 ? 'botella' : 'botellas'}
            </p>
          )}

          {effectiveMode === 'grid' ? (
            <div className="px-4 md:px-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-4xl">
              {beverages.map((b) => <BeverageGridCard key={b.id} beverage={b} />)}
            </div>
          ) : (
            <div className="max-w-4xl md:px-4">
              {beverages.map((b) => <BeverageCard key={b.id} beverage={b} />)}
            </div>
          )}

          {beverages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <p className="text-zinc-400 font-medium mb-1">
                {search || typeFilter ? 'Sin resultados' : 'Tu bodega está vacía'}
              </p>
              <p className="text-sm text-zinc-600">
                {search || typeFilter ? 'Probá con otros filtros' : 'Agregá tu primera bebida con el botón +'}
              </p>
            </div>
          )}
        </>
      )}

      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-zinc-100 text-zinc-900 rounded-full shadow-lg flex items-center justify-center text-2xl font-light hover:bg-white transition-colors z-20"
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
    </Layout>
  )
}

function BeverageGridCard({ beverage }) {
  const { id, name, producer, vintage, type, grape_variety, image_url, total_stock } = beverage
  return (
    <Link
      to={`/beverages/${id}`}
      className="bg-zinc-900 rounded-xl p-3 flex flex-col items-center gap-2 hover:bg-zinc-800 transition-colors border border-zinc-800 hover:border-zinc-700"
    >
      <BeverageIcon type={type} grape_variety={grape_variety} image_url={image_url} size={60} />
      <div className="w-full text-center">
        <p className="text-sm font-medium text-zinc-100 leading-tight line-clamp-2">{name}</p>
        {(producer || vintage) && (
          <p className="text-xs text-zinc-600 mt-0.5 truncate">
            {[producer, vintage].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between w-full mt-auto pt-1 border-t border-zinc-800">
        <span className="text-xs text-zinc-600">{TYPE_LABELS[type] ?? type}</span>
        <span className="text-sm font-semibold text-zinc-100">
          {total_stock}<span className="text-xs text-zinc-600 font-normal ml-0.5">u.</span>
        </span>
      </div>
    </Link>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1 rounded-full text-sm transition-colors ${
        active ? 'bg-zinc-100 text-zinc-900 font-medium' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
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
