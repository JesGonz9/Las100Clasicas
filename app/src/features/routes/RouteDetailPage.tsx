import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ExternalLink, MapPin, ArrowLeft, Plus, Star } from 'lucide-react'
import { getRoute, getComments, addComment, getAscents, getZones, getWalls, getUserProfile } from '@/services/firebase'
import { useAuth } from '@/hooks'
import { Spinner } from '@/components'
import type { Route, Comment as CommentType, Ascent, Zone, Wall, User as UserType } from '@/models'
import { Timestamp } from 'firebase/firestore'

export function RouteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [route, setRoute] = useState<Route | null>(null)
  const [comments, setComments] = useState<CommentType[]>([])
  const [ascents, setAscents] = useState<Ascent[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [walls, setWalls] = useState<Wall[]>([])
  const [userMap, setUserMap] = useState<Record<string, UserType>>({})
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<'info' | 'comments' | 'ascents'>('info')

  useEffect(() => {
    async function load() {
      if (!id) return
      const [routeData, commentsData, ascentsData, zonesData, wallsData] = await Promise.all([
        getRoute(id),
        getComments(id),
        getAscents(id),
        getZones(),
        getWalls(),
      ])
      setRoute(routeData)
      setComments(commentsData)
      setAscents(ascentsData.ascents)
      setZones(zonesData)
      setWalls(wallsData)

      // Resolve user names
      const allUserIds = new Set([
        ...commentsData.map((c) => c.userId),
        ...ascentsData.ascents.map((a) => a.userId),
      ])
      const profiles = await Promise.all(
        [...allUserIds].map((uid) => getUserProfile(uid)),
      )
      const map: Record<string, UserType> = {}
      for (const p of profiles) {
        if (p) map[p.id] = p
      }
      setUserMap(map)
      setLoading(false)
    }
    load()
  }, [id])

  async function handleAddComment() {
    if (!commentText.trim() || !user || !id) return
    setSubmitting(true)
    await addComment({ userId: user.id, routeId: id, content: commentText.trim() })
    setComments([
      { id: 'temp', userId: user.id, routeId: id, content: commentText.trim(), createdAt: Timestamp.now() },
      ...comments,
    ])
    setCommentText('')
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  if (!route) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Vía no encontrada</p>
        <Link to="/routes" className="text-primary hover:underline mt-2 inline-block">
          Volver al listado
        </Link>
      </div>
    )
  }

  const zone = zones.find((z) => z.id === route.zoneId)
  const wall = walls.find((w) => w.id === route.wallId)

  return (
    <div className="max-w-4xl mx-auto bg-white/60 backdrop-blur-sm min-h-screen">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-600/60 to-slate-400/40 backdrop-blur-sm p-6 flex items-center gap-4">
        <Link
          to="/routes"
          className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{route.name}</h1>
          {zone && (
            <button
              onClick={() => navigate(`/map?search=${encodeURIComponent(zone.name)}`)}
              className="text-white/80 flex items-center gap-1 mt-1 text-sm hover:text-white transition-colors"
            >
              <MapPin className="h-4 w-4" />
              {zone.name}{wall ? ` · ${wall.name}` : ''}
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div />
          <Link to={`/routes/${route.id}/ascent/new`} className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ascensión
          </Link>
        </div>

        {/* Difficulty badges */}
        <div className="flex gap-2 flex-wrap mb-4">
          {route.difficulty.free && <span className="badge bg-blue-100 text-blue-800">Libre: {route.difficulty.free}</span>}
          {route.difficulty.mandatory && <span className="badge bg-orange-100 text-orange-800">Obligatorio: {route.difficulty.mandatory}</span>}
          {route.difficulty.aid && <span className="badge bg-purple-100 text-purple-800">Artificial: {route.difficulty.aid}</span>}
          <span className="badge bg-gray-100 text-gray-700">{route.length}m</span>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-4">
          {(['info', 'comments', 'ascents'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'info' ? 'Info' : t === 'comments' ? `Comentarios (${comments.length})` : `Ascensiones (${ascents.length})`}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'info' && (
          <div className="space-y-4">
            <p className="text-gray-700 leading-relaxed">{route.description}</p>

            {route.externalLinks.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Enlaces</h3>
                <div className="space-y-1">
                  {route.externalLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-primary hover:underline text-sm"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'comments' && (
          <div className="space-y-4">
            {user && (
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Ej: Gran vía, muy recomendable..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <button onClick={handleAddComment} className="btn-primary" disabled={submitting || !commentText.trim()}>
                  Enviar
                </button>
              </div>
            )}
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Sin comentarios aún</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="card">
                  <p className="text-sm text-gray-500 mb-1">{userMap[c.userId]?.username ?? 'Usuario'}</p>
                  <p>{c.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'ascents' && (
          <div className="space-y-3">
            {ascents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nadie ha registrado una ascensión aún</p>
            ) : (
              ascents.map((a) => (
                <div key={a.id} className="card">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">{userMap[a.userId]?.username ?? 'Usuario'}</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-secondary" />
                      <span className="text-sm font-medium">{a.rating}/5</span>
                    </div>
                  </div>
                  {a.comment && <p className="mt-1">{a.comment}</p>}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
