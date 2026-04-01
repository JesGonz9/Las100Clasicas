import { Link, useLocation } from 'react-router-dom'
import { Mountain, User, Map, Bell, Settings, LogOut, Users } from 'lucide-react'
import { cn } from '@/utils'
import { useAuth } from '@/hooks'
import { signOut } from '@/services/firebase'

const navItems = [
  { to: '/routes', icon: Mountain, label: 'Vías' },
  { to: '/map', icon: Map, label: 'Mapa' },
  { to: '/profile', icon: User, label: 'Perfil' },
  { to: '/social', icon: Users, label: 'Social' },
  { to: '/notifications', icon: Bell, label: 'Notificaciones' },
  // Admin solo para admin
]

export function Sidebar() {
  const { pathname } = useLocation()
  const { user } = useAuth()

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white/50 backdrop-blur-md border-r border-white/40 h-screen sticky top-0">
      <div className="p-6 border-b border-white/40">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-primary">
          <Mountain className="h-7 w-7" />
          Las 100 Clásicas
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-white/50',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          )
        })}
        {/* Solo admin puede ver el panel de admin */}
        {user?.role === 'admin' && (
          <Link
            to="/admin"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              pathname.startsWith('/admin') ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-white/50',
            )}
          >
            <Settings className="h-5 w-5" />
            Admin
          </Link>
        )}
      </nav>

      {user && (
        <div className="p-4 border-t border-white/40">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <User className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium truncate">{user.username}</span>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-danger transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </div>
        )}
      </aside>
    )
  }
