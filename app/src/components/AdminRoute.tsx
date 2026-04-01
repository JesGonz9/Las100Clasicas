import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { FullPageSpinner } from './Spinner'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isAdmin, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />

  return <>{children}</>
}
