import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'
import ReviewForm from '../components/ReviewForm'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Community() {
  const { user }                    = useAuth()
  const [reviews,    setReviews]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [search,     setSearch]     = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = search ? `?q=${encodeURIComponent(search)}` : ''
      setReviews(await api.get(`/reviews${params}`))
    } catch {
      setError('No se pudo cargar las reseñas')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const id = setTimeout(fetchReviews, search ? 300 : 0)
    return () => clearTimeout(id)
  }, [fetchReviews, search])

  const handleSave = async (formData) => {
    setSaving(true)
    try {
      await api.post('/reviews', formData)
      setShowForm(false)
      fetchReviews()
    } catch (err) {
      alert(err?.error || 'Error al publicar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta reseña?')) return
    try {
      await api.delete(`/reviews/${id}`)
      fetchReviews()
    } catch (err) {
      alert(err?.error || 'Error al eliminar')
    }
  }

  return (
    <Layout title="Comunidad">
      <div className="max-w-2xl px-4 md:px-8 py-6 space-y-4">

        <input
          type="search"
          placeholder="Buscar por nombre de bebida..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none focus:border-zinc-700 transition-colors"
        />

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        )}

        {error && <p className="text-sm text-red-400 py-8 text-center">{error}</p>}

        {!loading && !error && reviews.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-400 font-medium mb-1">
              {search ? 'Sin resultados' : 'Todavía no hay reseñas'}
            </p>
            <p className="text-sm text-zinc-600">
              {search ? 'Probá con otro término' : '¡Sé el primero en dejar una!'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {reviews.map((r) => (
            <ReviewCard
              key={r.id}
              review={r}
              isOwn={user?.id === r.user_id}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-14 h-14 bg-zinc-100 text-zinc-900 rounded-full shadow-lg flex items-center justify-center text-2xl font-light hover:bg-white transition-colors z-20"
        aria-label="Nueva reseña"
      >
        +
      </button>

      {showForm && (
        <ReviewForm
          onSave={handleSave}
          onClose={() => setShowForm(false)}
          loading={saving}
        />
      )}
    </Layout>
  )
}

function ReviewCard({ review, isOwn, onDelete }) {
  const date = new Date(review.created_at).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="bg-zinc-900 rounded-xl px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-zinc-100 truncate">{review.beverage_ref}</p>
          <p className="text-xs text-zinc-600 mt-0.5">{review.author_name ?? 'Anónimo'} · {date}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {review.rating != null && (
            <span className="text-sm font-semibold text-amber-400">
              ★ {review.rating}<span className="text-xs text-zinc-600 font-normal">/10</span>
            </span>
          )}
          {isOwn && (
            <button
              onClick={onDelete}
              className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
              </svg>
            </button>
          )}
        </div>
      </div>
      {review.body && (
        <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{review.body}</p>
      )}
    </div>
  )
}
