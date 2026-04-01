import { useEffect } from 'react'
import { useAuthStore } from './useAuthStore'
import { onAuthChange, getUserProfile, ensureUserProfile } from '@/services/firebase'

export function useAuth() {
  const { user, firebaseUser, loading, setUser, setFirebaseUser, setLoading } = useAuthStore()

  useEffect(() => {
    const unsub = onAuthChange(async (fbUser) => {
      if (fbUser) {
        setFirebaseUser({ uid: fbUser.uid, email: fbUser.email })
        let profile = await getUserProfile(fbUser.uid)
        if (!profile) {
          profile = await ensureUserProfile(fbUser.uid, fbUser.email ?? '')
        }
        // Obtener custom claims del token
        const tokenResult = await fbUser.getIdTokenResult()
        const role = tokenResult.claims.role === 'admin' ? 'admin' : 'user'
        setUser({ ...profile, role })
      } else {
        setFirebaseUser(null)
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [setUser, setFirebaseUser, setLoading])

  return { user, firebaseUser, loading, isAuthenticated: !!firebaseUser, isAdmin: user?.role === 'admin' }
}
