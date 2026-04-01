import { useState, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, Star } from 'lucide-react'
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

  const [achievementIndex, setAchievementIndex] = useState(0)

  function handleContinue() {
    if (achievementIndex < newAchievements.length - 1) {
      setAchievementIndex((i) => i + 1)
    } else {
      navigate(`/routes/${routeId}`)
    }
  }

  if (newAchievements.length > 0) {
    const a = newAchievements[achievementIndex]!
    const isLast = achievementIndex === newAchievements.length - 1
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
        onClick={handleContinue}
        style={{ background: 'radial-gradient(ellipse at center, #1e3a8a 0%, #0f172a 70%)' }}
      >
        {/* Decorative stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          {['top-8 left-12', 'top-16 right-20', 'top-32 left-1/3', 'bottom-24 left-16', 'bottom-16 right-12', 'bottom-40 right-1/3', 'top-1/2 left-8', 'top-1/2 right-6'].map((pos, i) => (
            <Star key={i} className={`absolute ${pos} text-yellow-300/30`} style={{ width: `${16 + (i % 3) * 8}px`, height: `${16 + (i % 3) * 8}px` }} />
          ))}
        </div>

        {/* Card */}
        <div
          className="relative mx-4 max-w-md w-full text-center space-y-5 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl px-8 py-12"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Counter */}
          {newAchievements.length > 1 && (
            <p className="text-white/50 text-xs uppercase tracking-widest">
              {achievementIndex + 1} / {newAchievements.length}
            </p>
          )}

          {/* Emoji */}
          <div className="relative inline-block">
            <span className="text-8xl drop-shadow-lg">{a.icon || '🏔️'}</span>
            <span className="absolute -top-2 -right-4 text-3xl animate-bounce">🎉</span>
          </div>

          {/* Label */}
          <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest">¡Logro desbloqueado!</p>

          {/* Achievement name */}
          <h2 className="text-3xl font-extrabold text-white leading-tight">{a.name}</h2>

          {/* Message — same visual weight as title */}
          {a.description && (
            <p className="text-2xl font-bold text-yellow-300 leading-snug">
              {a.description}
            </p>
          )}

          {/* Points */}
          {a.points > 0 && (
            <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/40 text-yellow-300 font-bold px-5 py-2 rounded-full">
              <Trophy className="h-4 w-4" />
              +{a.points} puntos
            </div>
          )}

          {/* Button */}
          <button
            onClick={handleContinue}
            className="w-full mt-2 bg-white text-primary font-bold py-3 rounded-xl hover:bg-yellow-50 transition-colors shadow-lg"
          >
            {isLast ? 'Continuar' : 'Siguiente logro →'}
          </button>

          <p className="text-white/30 text-xs">Toca en cualquier sitio para continuar</p>
        </div>
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

      <form onSubmit={handleSubmit} className="card space-y-4">
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
