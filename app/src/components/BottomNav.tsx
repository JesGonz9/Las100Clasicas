import { Link, useLocation } from 'react-router-dom'
import { Mountain, User, Map, Bell, Users } from 'lucide-react'
import { cn } from '@/utils'

const navItems = [
  { to: '/routes', icon: Mountain, label: 'Vías' },
  { to: '/map', icon: Map, label: 'Mapa' },
  { to: '/profile', icon: User, label: 'Perfil' },
  { to: '/social', icon: Users, label: 'Social' },
  { to: '/notifications', icon: Bell, label: 'Avisos' },
]

export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/50 backdrop-blur-md border-t border-white/40 z-50 md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-1 text-xs transition-colors',
                active ? 'text-primary' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
