import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import BeverageIcon from '../components/BeverageIcon'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

const TYPE_FILTERS = [
  { value: 'all',     label: 'Todos' },
  { value: 'wine',    label: 'Vino' },
  { value: 'beer',    label: 'Cerveza' },
  { value: 'spirits', label: 'Destilado' },
]

const SOURCE_LABELS = {
  vivino:        { label: 'Vivino',    color: 'text-amber-400 bg-amber-950' },
  openfoodfacts: { label: 'OFF',       color: 'text-green-400 bg-green-950' },
  catalog:       { label: 'Catálogo',  color: 'text-zinc-400 bg-zinc-800'   },
}

const IMPORT_SOURCES = {
  wine:    'Vivino',
  beer:    'Open Food Facts',
  spirits: 'Open Food Facts',
  all:     'Vivino',
}

export default function Search() {
  const navigate   = useNavigate()
  const { user }   = useAuth()

  const [query,     setQuery]     = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [tab,       setTab]       = useState('online')
  const [results,   setResults]   = useState({ online: [], catalog: [] })
  const [loading,   setLoading]   = useState({ online: false, catalog: false })
  const [errors,    setErrors]    = useState({ online: null, catalog: null })
  const [searched,  setSearched]  = useState(false)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState(null)

  const search = async () => {
    if (!query.trim()) return
    setSearched(true)
    setResults({ online: [], catalog: [] })
    setErrors({ online: null, catalog: null })
    setLoading({ online: true, catalog: true })
    setImportMsg(null)

    const q   = query.trim()
    const cat = typeFilter !== 'all' ? typeFilter : undefined

    api.post('/scraper/search', { q, type: typeFilter })
      .then(data  => setResults(r => ({ ...r, online: data })))
      .catch(err  => setErrors(e  => ({ ...e, online: err?.error || 'Error al buscar online' })))
      .finally(() => setLoading(l => ({ ...l, online: false })))

    api.get(`/beverages/suggestions?q=${encodeURIComponent(q)}${cat ? `&type=${cat}` : ''}`)
      .then(data  => setResults(r => ({ ...r, catalog: data })))
      .catch(()   => setErrors(e  => ({ ...e, catalog: 'Error al buscar en catálogo' })))
      .finally(() => setLoading(l => ({ ...l, catalog: false })))
  }

  const handleImport = async () => {
    const importType = typeFilter === 'all' ? 'wine' : typeFilter
    setImporting(true)
    setImportMsg(null)
    try {
      const data = await api.post('/scraper/import', {
        q: query.trim(),
        type: importType,
        pages: importType === 'wine' ? 3 : 1,
      })
      setImportMsg(`✓ ${data.imported} nuevos, ${data.updated} actualizados`)
      api.get(`/beverages/suggestions?q=${encodeURIComponent(query.trim())}`)
        .then(d => setResults(r => ({ ...r, catalog: d })))
        .catch(() => {})
    } catch (err) {
      setImportMsg(`Error: ${err?.error || 'No se pudo importar'}`)
    } finally {
      setImporting(false)
    }
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

  const activeResults = results[tab]
  const isLoading     = loading[tab]
  const activeError   = errors[tab]

  return (
    <Layout title="Buscar bebida">
      <div className="max-w-2xl px-4 md:px-8 py-6 space-y-4">

        {/* Buscador */}
        <div className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={e => { setQuery(e.target.value); setImportMsg(null) }}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Buscar vino, cerveza, destilado..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
          />
          <button
            onClick={search}
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
              onClick={() => setTypeFilter(f.value)}
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

        {/* Importar al catálogo — solo admins */}
        {user?.is_admin && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={!query.trim() || importing}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-40 transition-colors"
            >
              {importing
                ? <><Spinner /> Importando...</>
                : <><DownloadIcon /> Guardar en catálogo ({IMPORT_SOURCES[typeFilter]})</>
              }
            </button>
            {importMsg && (
              <span className={`text-xs ${importMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                {importMsg}
              </span>
            )}
          </div>
        )}

        {/* Tabs */}
        {searched && (
          <div className="flex border-b border-zinc-800">
            {[
              { id: 'online',  label: 'Online' },
              { id: 'catalog', label: 'Catálogo' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t.id
                    ? 'border-zinc-100 text-zinc-100'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t.label}
                {results[t.id].length > 0 && (
                  <span className="ml-1.5 text-xs text-zinc-600">({results[t.id].length})</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Resultados */}
        {searched && (
          <>
            {isLoading && (
              <div className="flex justify-center py-10">
                <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
              </div>
            )}
            {!isLoading && activeError && (
              <p className="text-sm text-red-400 py-6 text-center">{activeError}</p>
            )}
            {!isLoading && !activeError && activeResults.length === 0 && (
              <p className="text-sm text-zinc-600 py-10 text-center">
                Sin resultados para "{query}"
              </p>
            )}
            <div className="space-y-2">
              {activeResults.map((item, i) => (
                <ResultCard key={i} item={item} onSelect={() => handleSelect(item)} />
              ))}
            </div>
          </>
        )}

        {!searched && (
          <p className="text-sm text-zinc-600 text-center py-10">
            Buscá una bebida para agregarla a tu bodega con los datos pre-llenados
          </p>
        )}
      </div>
    </Layout>
  )
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

function ResultCard({ item, onSelect }) {
  const badge = SOURCE_LABELS[item.source]

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
            <span className="text-xs text-amber-400 shrink-0">★ {Number(item.vivino_rating).toFixed(1)}</span>
          )}
          {badge && (
            <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${badge.color}`}>
              {badge.label}
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
