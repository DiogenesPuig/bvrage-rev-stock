import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import BeverageIcon from '../components/BeverageIcon'
import { api } from '../services/api'

const TYPE_FILTERS = [
  { value: '',        label: 'Todos' },
  { value: 'wine',    label: 'Vino' },
  { value: 'beer',    label: 'Cerveza' },
  { value: 'spirits', label: 'Destilado' },
  { value: 'other',   label: 'Otro' },
]

export default function Search() {
  const navigate     = useNavigate()
  const inputRef     = useRef(null)

  const [query,      setQuery]      = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [results,    setResults]    = useState([])
  const [loading,    setLoading]    = useState(false)
  const [searched,   setSearched]   = useState(false)

  const search = async (q = query, type = typeFilter) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({ q: trimmed })
      if (type) params.set('type', type)
      const data = await api.get(`/beverages/suggestions?${params}`)
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleTypeChange = (t) => {
    setTypeFilter(t)
    if (query.trim()) search(query, t)
  }

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
      <div className="max-w-2xl px-4 md:px-8 py-6 space-y-4">

        {/* Buscador */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Nombre o productor..."
            autoFocus
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
          />
          <button
            onClick={() => search()}
            disabled={!query.trim()}
            className="px-4 bg-zinc-100 text-zinc-900 rounded-xl font-medium text-sm hover:bg-white transition-colors disabled:opacity-40"
          >
            Buscar
          </button>
        </div>

        {/* Filtro por tipo */}
        <div className="flex gap-2 flex-wrap">
          {TYPE_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => handleTypeChange(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
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
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="py-10 text-center space-y-3">
            <p className="text-sm text-zinc-500">
              Sin resultados para "{query}"
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
          <div className="space-y-2">
            {results.map((item, i) => (
              <ResultCard key={i} item={item} onSelect={() => handleSelect(item)} />
            ))}

            {/* Siempre ofrecemos crear manual al final */}
            <div className="pt-2 text-center">
              <button
                onClick={handleCreateManual}
                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                ¿No encontraste lo que buscabas? Crear manualmente
              </button>
            </div>
          </div>
        )}

        {!searched && (
          <p className="text-sm text-zinc-600 text-center py-10">
            Buscá una bebida del catálogo para agregarla a tu bodega con los datos pre-llenados
          </p>
        )}
      </div>
    </Layout>
  )
}

function ResultCard({ item, onSelect }) {
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
        {item.alcohol_pct && (
          <p className="text-xs text-zinc-600 mt-0.5">{item.alcohol_pct}% alc.</p>
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
