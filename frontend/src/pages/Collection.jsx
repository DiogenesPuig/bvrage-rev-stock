import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import BeverageCard from '../components/BeverageCard'
import BeverageForm from '../components/BeverageForm'
import { api } from '../services/api'

const TYPES = ['wine', 'beer', 'spirits', 'other']
const TYPE_LABELS = { wine: 'Vino', beer: 'Cerveza', spirits: 'Destilado', other: 'Otro' }

export default function Collection() {
  const [beverages, setBeverages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchBeverages = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (search)     params.set('search', search)
      if (typeFilter) params.set('type', typeFilter)
      const data = await api.get(`/beverages?${params}`)
      setBeverages(data)
    } catch {
      setError('No se pudo cargar la colección')
    } finally {
      setLoading(false)
    }
  }, [search, typeFilter])

  useEffect(() => {
    const id = setTimeout(fetchBeverages, search ? 300 : 0)
    return () => clearTimeout(id)
  }, [fetchBeverages, search])

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

  const totalBottles = beverages.reduce((sum, b) => sum + (b.total_stock || 0), 0)

  return (
    <Layout title="Mi colección">
      <div className="px-4 pt-4 pb-2 space-y-3">
        <input
          type="search"
          placeholder="Buscar por nombre o productor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
        />

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

      {error && (
        <p className="text-center text-sm text-red-400 py-8">{error}</p>
      )}

      {!loading && !error && (
        <>
          {beverages.length > 0 && (
            <p className="px-4 py-2 text-xs text-zinc-600">
              {beverages.length} {beverages.length === 1 ? 'bebida' : 'bebidas'} · {totalBottles} {totalBottles === 1 ? 'botella' : 'botellas'}
            </p>
          )}

          <div>
            {beverages.map((b) => (
              <BeverageCard key={b.id} beverage={b} />
            ))}
          </div>

          {beverages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <p className="text-zinc-400 font-medium mb-1">
                {search || typeFilter ? 'Sin resultados' : 'Tu colección está vacía'}
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
        className="fixed bottom-20 right-4 w-14 h-14 bg-zinc-100 text-zinc-900 rounded-full shadow-lg flex items-center justify-center text-2xl font-light hover:bg-white transition-colors"
        aria-label="Agregar bebida"
      >
        +
      </button>

      {showForm && (
        <BeverageForm
          onSave={handleAdd}
          onClose={() => setShowForm(false)}
          loading={saving}
        />
      )}
    </Layout>
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
