import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/hooks'
import { updateUserProfile } from '@/services/firebase/firestore'
import { useAuthStore } from '@/hooks/useAuthStore'

export function EditProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const setUser = useAuthStore((s) => s.setUser)
  const [username, setUsername] = useState(user?.username ?? '')
  const [bio, setBio] = useState(user?.bio ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError('')

    try {
      await updateUserProfile(user.id, { username, bio })
      setUser({ ...user, username, bio })
      navigate('/profile')
    } catch {
      setError('Error al actualizar el perfil')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      <h1 className="text-2xl font-bold mb-6">Editar Perfil</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-danger text-sm p-3 rounded-lg">{error}</div>}

        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
            <UserIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de usuario</label>
          <input type="text" className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            className="input min-h-[80px] resize-y"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Ej: Escalador de Madrid, aficionado a las clásicas..."
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
