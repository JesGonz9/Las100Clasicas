import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { Layout, ProtectedRoute, FullPageSpinner, AdminRoute } from '@/components'
import { LoginPage, RegisterPage } from '@/features/auth'
import { RoutesListPage, RouteDetailPage } from '@/features/routes'
import { NewAscentPage } from '@/features/ascents'
import { ProfilePage, EditProfilePage } from '@/features/profile'
import { NotificationsPage, SocialPage, FollowListPage } from '@/features/social'
import { MapPage } from '@/features/map'
import { DashboardPage } from '@/features/dashboard'
import { AdminPage } from '@/features/admin'

export function App() {
  const { loading } = useAuth()

  if (loading) return <FullPageSpinner />

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/routes" element={<RoutesListPage />} />
        <Route path="/routes/:id" element={<RouteDetailPage />} />
        <Route path="/routes/:routeId/ascent/new" element={<NewAscentPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/social" element={<SocialPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/profile/:userId/:type" element={<FollowListPage />} />
        <Route path="/admin" element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        } />
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/routes" replace />} />
    </Routes>
  )
}
