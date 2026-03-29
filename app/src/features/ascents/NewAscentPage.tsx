import { useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy } from 'lucide-react'
import { createAscent, checkAchievements } from '@/services/firebase/firestore'
import { useAuth } from '@/hooks'
import { Timestamp } from 'firebase/firestore'
import type { Achievement } from '@/models'

export function NewAscentPage() {
  const { routeId } = useParams<{ routeId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!)
  const [rating, setRating] = useState(3)
  const [comment, setComment] = useState('')
  const [partners, setPartners] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) {
      setError('No se ha podido identificar al usuario. Cierra sesión y vuelve a entrar.')
      return
    }
    if (!routeId) {
      setError('No se ha podido identificar la vía.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await createAscent({
        userId: user.id,
        routeId,
        date: Timestamp.fromDate(new Date(date)),
        rating,
        comment,
        partners: partners
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
        photos: [],
      })

      const unlocked = await checkAchievements(user.id)
      if (unlocked.length > 0) {
        setNewAchievements(unlocked)
        setLoading(false)
        return
      }

      navigate(`/routes/${routeId}`)
    } catch (err) {
      console.error('Error al registrar ascensión:', err)
      setError(err instanceof Error ? err.message : 'Error al registrar la ascensión')
    } finally {
      setLoading(false)
    }
  }

  if (newAchievements.length > 0) {
    return (
      <div className="p-4 max-w-lg mx-auto text-center">
        <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">¡Logro desbloqueado!</h1>
        <div className="space-y-3 mb-6">
          {newAchievements.map((a) => (
            <div key={a.id} className="card bg-yellow-50 border-yellow-200">
              <span className="text-3xl">{a.icon || '🏔️'}</span>
              <p className="font-bold mt-1">{a.name}</p>
              <p className="text-sm text-gray-600">{a.description}</p>
              {a.points > 0 && <p className="text-sm font-medium text-yellow-700 mt-1">+{a.points} puntos</p>}
            </div>
          ))}
        </div>
        <button onClick={() => navigate(`/routes/${routeId}`)} className="btn-primary w-full">
          Continuar
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      <h1 className="text-2xl font-bold mb-6">Nueva Ascensión</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="bg-red-50 text-danger text-sm p-3 rounded-lg">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Valoración</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setRating(v)}
                className={`h-10 w-10 rounded-full text-sm font-bold transition-colors ${
                  v <= rating ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Comentario</label>
          <textarea
            className="input min-h-[100px] resize-y"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ej: Gran ambiente, roca perfecta..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Compañeros (separados por coma)</label>
          <input
            type="text"
            className="input"
            value={partners}
            onChange={(e) => setPartners(e.target.value)}
            placeholder="Ej: Juan, María..."
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Guardando...' : 'Registrar Ascensión'}
        </button>
      </form>
    </div>
  )
}
