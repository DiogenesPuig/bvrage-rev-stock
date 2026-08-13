import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ displayName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    try {
      await register(form.email, form.password, form.displayName || undefined)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err?.error || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-sm card border-t border-t-gold/15 px-8 py-10">
        <div className="text-center mb-8">
          <h1 className="font-serif text-gold text-2xl mb-1.5">CaveBin</h1>
          <p className="text-ink-soft text-sm">Creá tu cuenta para armar tu bodega</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label-caps block mb-1.5" htmlFor="displayName">
              Nombre <span className="text-muted normal-case">(opcional)</span>
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              autoComplete="name"
              value={form.displayName}
              onChange={handleChange}
              className="field-underline"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="label-caps block mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={handleChange}
              className="field-underline"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="label-caps block mb-1.5" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={handleChange}
              className="field-underline"
              placeholder="Mínimo 8 caracteres"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-gold hover:text-gold-hover transition-colors">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
