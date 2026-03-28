import { useState, useEffect } from 'react'
import { BarChart3, Mountain, Users, Trophy, Medal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks'
import { getAscents, getZones, getRoutes, getFollowers, getFollowing, getAllUsers } from '@/services/firebase'
import { Spinner } from '@/components'
import type { Route, Zone, Ascent, User } from '@/models'

interface RankedUser {
  user: User
  count: number
}

export function DashboardPage() {
  const { user } = useAuth()
  const [ascents, setAscents] = useState<Ascent[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [globalRanking, setGlobalRanking] = useState<RankedUser[]>([])
  const [socialRanking, setSocialRanking] = useState<RankedUser[]>([])
  const [rankingTab, setRankingTab] = useState<'global' | 'social'>('global')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!user) return
      const [ascentsData, routesData, zonesData, followersData, followingData, allUsers] = await Promise.all([
        getAscents(undefined, user.id),
        getRoutes(),
        getZones(),
        getFollowers(user.id),
        getFollowing(user.id),
        getAllUsers(),
      ])
      setAscents(ascentsData.ascents)
      setRoutes(routesData.routes)
      setZones(zonesData)
      setFollowers(followersData.length)
      setFollowing(followingData.length)

      // Build global ranking: get ascent counts for all users
      const userAscents = await Promise.all(
        allUsers.map(async (u) => {
          const data = await getAscents(undefined, u.id)
          const uniqueRoutes = new Set(data.ascents.map((a) => a.routeId))
          return { user: u, count: uniqueRoutes.size }
        }),
      )
      const sorted = userAscents.filter((r) => r.count > 0).sort((a, b) => b.count - a.count)
      setGlobalRanking(sorted)

      // Social ranking: only users I follow + myself
      const followingIds = new Set(followingData.map((f) => f.followingId))
      followingIds.add(user.id)
      setSocialRanking(sorted.filter((r) => followingIds.has(r.user.id)))

      setLoading(false)
    }
    load()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  const completedRouteIds = new Set(ascents.map((a) => a.routeId))
  const completionPercent = routes.length > 0 ? Math.round((completedRouteIds.size / routes.length) * 100) : 0

  // Stats by zone
  const zoneStats = zones.map((zone) => {
    const zoneRoutes = routes.filter((r) => r.zoneId === zone.id)
    const completed = zoneRoutes.filter((r) => completedRouteIds.has(r.id)).length
    return { zone, total: zoneRoutes.length, completed }
  }).filter((s) => s.total > 0)

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={<Mountain className="h-5 w-5 text-primary" />} label="Ascensiones" value={ascents.length} />
        <StatCard icon={<BarChart3 className="h-5 w-5 text-accent" />} label="Completado" value={`${completionPercent}%`} />
        <StatCard icon={<Users className="h-5 w-5 text-secondary" />} label="Seguidores" value={followers} />
        <StatCard icon={<Trophy className="h-5 w-5 text-yellow-500" />} label="Siguiendo" value={following} />
      </div>

      {/* Progress bar */}
      <div className="card mb-6">
        <h2 className="font-semibold mb-3">Progreso general</h2>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <span className="text-sm font-bold text-primary">{completedRouteIds.size}/{routes.length}</span>
        </div>
      </div>

      {/* Zone breakdown */}
      <div className="card">
        <h2 className="font-semibold mb-4">Progreso por zona</h2>
        <div className="space-y-3">
          {zoneStats.map(({ zone, total, completed }) => (
            <div key={zone.id}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{zone.name}</span>
                <span className="text-gray-500">{completed}/{total}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking */}
      <div className="card mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Medal className="h-5 w-5 text-yellow-500" />
            Ranking
          </h2>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setRankingTab('global')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                rankingTab === 'global' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'
              }`}
            >
              Global
            </button>
            <button
              onClick={() => setRankingTab('social')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                rankingTab === 'social' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'
              }`}
            >
              Amigos
            </button>
          </div>
        </div>

        {(rankingTab === 'global' ? globalRanking : socialRanking).length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            {rankingTab === 'social' ? 'Sigue a otros escaladores para ver el ranking social' : 'Sin datos aún'}
          </p>
        ) : (
          <div className="space-y-2">
            {(rankingTab === 'global' ? globalRanking : socialRanking).map((entry, i) => {
              const isMe = entry.user.id === user?.id
              return (
                <Link
                  key={entry.user.id}
                  to={`/profile/${entry.user.id}`}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isMe ? 'bg-primary/5 border border-primary/20' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-yellow-100 text-yellow-700' :
                    i === 1 ? 'bg-gray-200 text-gray-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                    {entry.user.username[0]?.toUpperCase()}
                  </div>
                  <span className={`flex-1 text-sm truncate ${isMe ? 'font-bold' : 'font-medium'}`}>
                    {entry.user.username}{isMe ? ' (tú)' : ''}
                  </span>
                  <span className="text-sm font-bold text-primary">{entry.count}</span>
                  <span className="text-xs text-gray-400">vías</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="card flex flex-col items-center text-center">
      {icon}
      <span className="text-2xl font-bold mt-1">{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}
