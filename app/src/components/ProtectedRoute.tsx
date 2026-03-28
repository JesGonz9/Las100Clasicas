import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { FullPageSpinner } from './Spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <FullPageSpinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <>{children}</>
}
