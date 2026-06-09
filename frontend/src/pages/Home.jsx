import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import Layout from '../components/Layout'
import BeverageIcon from '../components/BeverageIcon'

export default function Home() {
  const { user } = useAuth()
  return user ? <HomeLoggedIn /> : <HomePublic />
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <span className="font-semibold text-lg tracking-tight">CaveBin</span>
        <div className="flex gap-3">
          <Link to="/login"    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Iniciar sesión</Link>
          <Link to="/register" className="text-sm bg-zinc-100 text-zinc-900 px-3 py-1.5 rounded-lg font-medium hover:bg-white transition-colors">Registrarse</Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-zinc-100 mb-2">Descubrí bebidas</h1>
          <p className="text-zinc-500">Las más reseñadas por la comunidad</p>
        </div>

        {loading && <Spinner />}

        {!loading && featured.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-400 mb-1">Todavía no hay reseñas</p>
            <p className="text-sm text-zinc-600">
              <Link to="/register" className="text-zinc-400 hover:text-zinc-200 underline">Registrate</Link> y sé el primero en dejar una
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

// ─── Vista logueada ───────────────────────────────────────────────────────────

function HomeLoggedIn() {
  const [featured, setFeatured]     = useState([])
  const [myStock, setMyStock]       = useState([])
  const [loadingF, setLoadingF]     = useState(true)
  const [loadingS, setLoadingS]     = useState(true)

  useEffect(() => {
    api.get('/reviews/featured')
      .then(setFeatured)
      .catch(() => {})
      .finally(() => setLoadingF(false))

    api.get('/beverages')
      .then((data) => {
        const withStock = data
          .filter((b) => b.total_stock > 0)
          .sort((a, b) => b.total_stock - a.total_stock)
          .slice(0, 5)
        setMyStock(withStock)
      })
      .catch(() => {})
      .finally(() => setLoadingS(false))
  }, [])

  return (
    <Layout title="Inicio">
      <div className="max-w-3xl px-4 md:px-8 py-6 space-y-8">

        {/* Preview de stock */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Mi stock</h2>
            <Link to="/collection" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Ver todo →</Link>
          </div>

          {loadingS && <Spinner />}

          {!loadingS && myStock.length === 0 && (
            <p className="text-sm text-zinc-600 py-2">
              No tenés bebidas en stock.{' '}
              <Link to="/collection" className="text-zinc-400 hover:text-zinc-200">Agregá una →</Link>
            </p>
          )}

          {myStock.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {myStock.map((b) => (
                <Link
                  key={b.id}
                  to={`/beverages/${b.id}`}
                  className="shrink-0 w-28 bg-zinc-900 rounded-xl p-3 flex flex-col items-center gap-2 hover:bg-zinc-800 transition-colors border border-zinc-800"
                >
                  <BeverageIcon type={b.type} grape_variety={b.grape_variety} image_url={b.image_url} size={44} />
                  <p className="text-xs text-zinc-300 text-center leading-tight line-clamp-2 w-full">{b.name}</p>
                  <span className="text-lg font-semibold text-zinc-100">{b.total_stock}<span className="text-xs text-zinc-600 font-normal ml-0.5">u.</span></span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Bebidas conocidas */}
        <section>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">Más reseñadas</h2>

          {loadingF && <Spinner />}

          {!loadingF && featured.length === 0 && (
            <p className="text-sm text-zinc-600 py-2">
              Todavía no hay reseñas.{' '}
              <Link to="/community" className="text-zinc-400 hover:text-zinc-200">Escribí la primera →</Link>
            </p>
          )}

          <div className="space-y-1">
            {featured.map((item) => (
              <FeaturedCard key={item.beverage_ref} item={item} />
            ))}
          </div>
        </section>
      </div>
    </Layout>
  )
}

// ─── Componentes compartidos ──────────────────────────────────────────────────

function FeaturedCard({ item }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-zinc-900 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-zinc-100 truncate">{item.beverage_ref}</p>
        {item.latest_body && (
          <p className="text-sm text-zinc-500 truncate mt-0.5">"{item.latest_body}"</p>
        )}
      </div>
      <div className="shrink-0 text-right space-y-0.5">
        {item.avg_rating != null && (
          <p className="text-sm font-semibold text-zinc-100">{item.avg_rating}<span className="text-xs text-zinc-600 font-normal">/10</span></p>
        )}
        <p className="text-xs text-zinc-600">{item.review_count} {item.review_count === 1 ? 'reseña' : 'reseñas'}</p>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
    </div>
  )
}
