import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/',           label: 'Comunidad', icon: StarIcon },
  { to: '/collection', label: 'Mi Bodega', icon: BottleIcon },
  { to: '/activity',   label: 'Actividad', icon: ActivityIcon },
]

export default function Layout({ children, title }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">

      {/* Header — desktop */}
      <header className="hidden md:flex items-center justify-between h-20 px-8 border-b border-border-soft sticky top-0 bg-header backdrop-blur-xl z-20">
        <span className="font-serif text-gold text-xl">CaveBin</span>

        <nav className="flex items-center gap-8">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `text-xs uppercase tracking-widest transition-colors ${
                  isActive ? 'text-gold' : 'text-ink-soft hover:text-ink'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="border border-border text-ink-soft text-xs uppercase tracking-widest px-4 py-2 hover:border-gold/40 hover:text-gold transition-colors"
        >
          Cerrar sesión
        </button>
      </header>

      {/* Header — mobile only */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border-soft sticky top-0 bg-header backdrop-blur-xl z-20">
        <span className="font-serif text-gold">{title || 'CaveBin'}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-muted hover:text-ink-soft transition-colors"
        >
          Salir
        </button>
      </header>

      {/* Page title — desktop */}
      {title && (
        <div className="hidden md:block px-8 py-6 border-b border-border-soft">
          <h1 className="text-xl">{title}</h1>
        </div>
      )}

      <main className="flex-1 pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-header backdrop-blur-xl border-t border-border-soft flex z-10">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                isActive ? 'text-gold' : 'text-muted hover:text-ink-soft'
              }`
            }
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function BottleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6l1 4H8L9 3z"/>
      <path d="M8 7c0 0-2 2-2 6s2 8 6 8 6-4 6-8-2-6-2-6"/>
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}

function ActivityIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 3"/>
    </svg>
  )
}
