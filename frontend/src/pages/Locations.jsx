import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import LocationForm from '../components/LocationForm'
import { api } from '../services/api'

export default function Locations() {
  const [locations,  setLocations]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editing,    setEditing]    = useState(null)
  const [saving,     setSaving]     = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  const fetchLocations = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setLocations(await api.get('/locations'))
    } catch {
      setError('No se pudo cargar las ubicaciones')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLocations() }, [fetchLocations])

  const handleSave = async (formData) => {
    setSaving(true)
    try {
      if (editing) {
        await api.put(`/locations/${editing.id}`, formData)
      } else {
        await api.post('/locations', formData)
      }
      setShowForm(false)
      setEditing(null)
      fetchLocations()
    } catch (err) {
      alert(err?.error || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/locations/${id}`)
      setConfirmDel(null)
      fetchLocations()
    } catch (err) {
      alert(err?.error || 'Error al eliminar')
    }
  }

  const openEdit = (loc) => { setEditing(loc); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setEditing(null) }

  return (
    <Layout title="Ubicaciones">
      <div className="max-w-2xl px-4 md:px-8 py-6">

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        )}

        {error && <p className="text-sm text-red-400 py-8 text-center">{error}</p>}

        {!loading && !error && (
          <>
            {locations.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-zinc-400 font-medium mb-1">Sin ubicaciones</p>
                <p className="text-sm text-zinc-600">Creá una para organizar tu colección</p>
              </div>
            ) : (
              <div className="space-y-2">
                {locations.map((loc) => (
                  <div
                    key={loc.id}
                    className="bg-zinc-900 rounded-xl px-4 py-3.5 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400">
                      <LocationIcon />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-100">{loc.name}</p>
                      {loc.description && (
                        <p className="text-sm text-zinc-500 truncate">{loc.description}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-semibold text-zinc-100">{loc.total_bottles}<span className="text-xs text-zinc-600 ml-1">u.</span></p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEdit(loc)}
                        className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <EditIcon />
                      </button>
                      <button
                        onClick={() => setConfirmDel(loc)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-zinc-100 text-zinc-900 rounded-full shadow-lg flex items-center justify-center text-2xl font-light hover:bg-white transition-colors z-20"
        aria-label="Nueva ubicación"
      >
        +
      </button>

      {showForm && (
        <LocationForm
          initial={editing}
          onSave={handleSave}
          onClose={closeForm}
          loading={saving}
        />
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDel(null)} />
          <div className="relative bg-zinc-900 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-zinc-100 mb-2">¿Eliminar "{confirmDel.name}"?</h3>
            <p className="text-sm text-zinc-500 mb-5">Las bebidas en esta ubicación quedarán sin asignar.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="flex-1 bg-zinc-800 text-zinc-300 rounded-lg py-2.5 text-sm hover:bg-zinc-700 transition-colors">Cancelar</button>
              <button onClick={() => handleDelete(confirmDel.id)} className="flex-1 bg-red-900 text-red-200 rounded-lg py-2.5 text-sm hover:bg-red-800 transition-colors">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function LocationIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/>
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  )
}
