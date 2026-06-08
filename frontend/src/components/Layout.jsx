import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/',           label: 'Colección', icon: BottleIcon },
  { to: '/locations',  label: 'Lugares',   icon: LocationIcon },
  { to: '/community',  label: 'Comunidad', icon: StarIcon },
]

export default function Layout({ children, title }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col max-w-lg mx-auto">
      <header className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 border-b border-zinc-800">
        <span className="font-semibold text-zinc-100">{title || 'CaveBin'}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Salir
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-zinc-900 border-t border-zinc-800 flex pb-safe">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                isActive ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6l1 4H8L9 3z"/>
      <path d="M8 7c0 0-2 2-2 6s2 8 6 8 6-4 6-8-2-6-2-6"/>
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  )
}

function StarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}
