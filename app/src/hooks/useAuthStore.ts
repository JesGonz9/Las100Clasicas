import { create } from 'zustand'
import type { User } from '@/models'

interface AuthState {
  user: User | null
  firebaseUser: { uid: string; email: string | null } | null
  loading: boolean
  setUser: (user: User | null) => void
  setFirebaseUser: (user: { uid: string; email: string | null } | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  firebaseUser: null,
  loading: true,
  setUser: (user) => set({ user }),
  setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
  setLoading: (loading) => set({ loading }),
}))
