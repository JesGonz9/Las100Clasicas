import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus, UserMinus, Users, Trophy, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/hooks'
import {
  searchUsers,
  getFollowing,
  getAscents,
  followUser,
  unfollowUser,
  getUserProfile,
  getRoutes,
  getAllUsers,
  getAllUserAchievements,
  getAchievements,
} from '@/services/firebase'
import { Spinner, EmptyState } from '@/components'
import { calculateAscentPoints } from '@/utils'
import type { User, Ascent, Route, Achievement } from '@/models'

interface FeedItem {
  ascent: Ascent
  user: User
  route: Route | null
}

export function SocialPage() {
  const { user: currentUser } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loadingFeed, setLoadingFeed] = useState(true)
  const [tab, setTab] = useState<'feed' | 'search' | 'ranking'>('feed')

  // Load following IDs and feed
  useEffect(() => {
    async function load() {
      if (!currentUser) return
      const following = await getFollowing(currentUser.id)
      const ids = new Set(following.map((f) => f.followingId))
      setFollowingIds(ids)

      const followedIds = [...ids]
      if (followedIds.length === 0) {
        setLoadingFeed(false)
        return
      }

      // Fetch profiles, all routes and all followed-users' ascents in parallel
      const [profileResults, allRoutesData, ascentsResults] = await Promise.all([
        Promise.all(followedIds.map((uid) => getUserProfile(uid))),
        getRoutes(),
        Promise.all(followedIds.map((uid) => getAscents(undefined, uid))),
      ])

      const routeMap = new Map(allRoutesData.routes.map((r) => [r.id, r]))

      const feedItems: FeedItem[] = []
      for (let i = 0; i < followedIds.length; i++) {
        const profile = profileResults[i]
        const ascentsData = ascentsResults[i]
        if (profile && ascentsData) {
          for (const ascent of ascentsData.ascents) {
            feedItems.push({ ascent, user: profile, route: routeMap.get(ascent.routeId) ?? null })
          }
        }
      }
      feedItems.sort((a, b) => (b.ascent.date?.seconds ?? 0) - (a.ascent.date?.seconds ?? 0))
      setFeed(feedItems.slice(0, 20))
      setLoadingFeed(false)
    }
    load()
  }, [currentUser])

  async function handleSearch() {
    if (!searchTerm.trim()) return
    setSearching(true)
    const users = await searchUsers(searchTerm.trim())
    setResults(users.filter((u) => u.id !== currentUser?.id))
    setSearching(false)
  }

  async function handleToggleFollow(targetId: string) {
    if (!currentUser) return
    if (followingIds.has(targetId)) {
      await unfollowUser(currentUser.id, targetId)
      setFollowingIds((prev) => {
        const next = new Set(prev)
        next.delete(targetId)
        return next
      })
    } else {
      await followUser(currentUser.id, targetId)
      setFollowingIds((prev) => new Set(prev).add(targetId))
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Social</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setTab('feed')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'feed' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Actividad
        </button>
        <button
          onClick={() => setTab('search')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'search' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Buscar usuarios
        </button>
        <button
          onClick={() => setTab('ranking')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'ranking' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Ranking
        </button>
      </div>

      {tab === 'search' && (
        <>
          {/* Search bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="input pl-10"
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <button onClick={handleSearch} className="btn-primary" disabled={searching}>
              Buscar
            </button>
          </div>

          {/* Results */}
          {searching ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              {results.map((u) => (
                <div key={u.id} className="card flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/profile/${u.id}`} className="text-sm font-medium hover:text-primary truncate block">
                      {u.username}
                    </Link>
                    {u.bio && <p className="text-xs text-gray-500 truncate">{u.bio}</p>}
                  </div>
                  <button
                    onClick={() => handleToggleFollow(u.id)}
                    className={followingIds.has(u.id) ? 'btn-secondary flex items-center gap-1 text-sm' : 'btn-primary flex items-center gap-1 text-sm'}
                  >
                    {followingIds.has(u.id) ? (
                      <><UserMinus className="h-4 w-4" /> Siguiendo</>
                    ) : (
                      <><UserPlus className="h-4 w-4" /> Seguir</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : searchTerm && !searching ? (
            <p className="text-gray-500 text-center py-8">No se encontraron usuarios</p>
          ) : null}
        </>
      )}

      {tab === 'feed' && (
        <>
          {loadingFeed ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : feed.length === 0 ? (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="Sin actividad"
              description="Sigue a otros escaladores para ver su actividad aquí"
            />
          ) : (
            <div className="space-y-3">
              {feed.map((item) => (
                <div key={item.ascent.id} className="card">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <Link to={`/profile/${item.user.id}`} className="text-sm font-medium hover:text-primary">
                      {item.user.username}
                    </Link>
                    <span className="text-xs text-gray-400">ha escalado</span>
                  </div>
                  <Link to={`/routes/${item.ascent.routeId}`} className="block hover:text-primary">
                    <p className="font-medium">{item.route?.name ?? 'Vía desconocida'}</p>
                  </Link>
                  {item.ascent.comment && (
                    <p className="text-sm text-gray-600 mt-1">{item.ascent.comment}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span>⭐ {item.ascent.rating}/5</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'ranking' && <RankingTab followingIds={followingIds} currentUserId={currentUser?.id ?? ''} />}
    </div>
  )
}

interface RankingEntry {
  user: User
  ascentPoints: number
  achievementPoints: number
  totalPoints: number
  ascentCount: number
  achievementCount: number
}

function RankingTab({ followingIds, currentUserId }: { followingIds: Set<string>; currentUserId: string }) {
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState<'total' | 'friends'>('total')

  useEffect(() => {
    async function load() {
      // Fetch users, routes, achievements, all ascents and all userAchievements in parallel
      const [users, routesData, allAchievements, allAscentsData, allUserAchievementsData] = await Promise.all([
        getAllUsers(),
        getRoutes(),
        getAchievements(),
        getAscents(),
        getAllUserAchievements(),
      ])
      const routeMap = new Map(routesData.routes.map((r) => [r.id, r]))

      // Group ascents and userAchievements by userId in memory
      const uniqueRoutesByUser = new Map<string, Set<string>>()
      for (const ascent of allAscentsData.ascents) {
        if (!uniqueRoutesByUser.has(ascent.userId)) uniqueRoutesByUser.set(ascent.userId, new Set())
        uniqueRoutesByUser.get(ascent.userId)!.add(ascent.routeId)
      }

      const unlockedByUser = new Map<string, Set<string>>()
      for (const ua of allUserAchievementsData) {
        if (!unlockedByUser.has(ua.userId)) unlockedByUser.set(ua.userId, new Set())
        unlockedByUser.get(ua.userId)!.add(ua.achievementId)
      }

      const entries: RankingEntry[] = []
      for (const user of users) {
        const ascendedRouteIds = uniqueRoutesByUser.get(user.id) ?? new Set<string>()
        let ascentPoints = 0
        for (const routeId of ascendedRouteIds) {
          const route = routeMap.get(routeId)
          if (route) ascentPoints += calculateAscentPoints(route)
        }

        const unlockedIds = unlockedByUser.get(user.id) ?? new Set<string>()
        let achievementPoints = 0
        let achievementCount = 0
        for (const ach of allAchievements) {
          if (unlockedIds.has(ach.id)) {
            achievementPoints += ach.points ?? 0
            achievementCount++
          }
        }

        entries.push({
          user,
          ascentPoints,
          achievementPoints,
          totalPoints: ascentPoints + achievementPoints,
          ascentCount: ascendedRouteIds.size,
          achievementCount,
        })
      }

      entries.sort((a, b) => b.totalPoints - a.totalPoints)
      setRanking(entries)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>

  const friendIds = new Set([...followingIds, currentUserId])
  const displayed = scope === 'friends' ? ranking.filter((e) => friendIds.has(e.user.id)) : ranking

  if (ranking.length === 0) return (
    <EmptyState icon={<Trophy className="h-12 w-12" />} title="Sin ranking" description="Aún no hay usuarios con puntuación" />
  )

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div>
      {/* Sub-tabs Total / Amigos */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
        <button
          onClick={() => setScope('total')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
            scope === 'total' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'
          }`}
        >
          Total
        </button>
        <button
          onClick={() => setScope('friends')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
            scope === 'friends' ? 'bg-white shadow-sm text-primary' : 'text-gray-500'
          }`}
        >
          Amigos
        </button>
      </div>

      {displayed.length === 0 ? (
        <EmptyState icon={<Trophy className="h-12 w-12" />} title="Sin amigos en el ranking" description="Sigue a otros escaladores para ver su posición aquí" />
      ) : (
        <div className="space-y-2">
          {displayed.map((entry, i) => (
            <Link key={entry.user.id} to={`/profile/${entry.user.id}`} className="card block hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-8 text-center flex-shrink-0">
                  {i < 3 ? (
                    <span className="text-2xl">{medals[i]}</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-400">{i + 1}</span>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{entry.user.username}</p>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>{entry.ascentCount} vías</span>
                    <span>{entry.achievementCount} logros</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-primary">{entry.totalPoints}</p>
                  <p className="text-xs text-gray-400">puntos</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
