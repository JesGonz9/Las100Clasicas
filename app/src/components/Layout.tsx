import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { BackgroundCarousel } from './BackgroundCarousel'

export function Layout() {
  return (
    <div className="flex min-h-screen">
      <BackgroundCarousel />
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
