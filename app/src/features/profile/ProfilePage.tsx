import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Settings, UserPlus, UserMinus, Mountain, Trophy, CheckCircle, Trash2, BarChart3, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/hooks'
import { cn } from '@/utils'
import {
  getUserProfile,
  getAscents,
  deleteAscent,
  checkAchievements,
  getFollowers,
  getFollowing,
  isFollowing as checkFollowing,
  followUser,
  unfollowUser,
  getUserAchievements,
  getAchievements,
  getRoutes,
  getZones,
  signOut,
} from '@/services/firebase'
import { Spinner } from '@/components'
import { calculateAscentPoints } from '@/utils'
import type { User, Ascent, Achievement, UserAchievement, Route, Zone } from '@/models'

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()
  const isOwnProfile = !userId || userId === currentUser?.id

  const [profile, setProfile] = useState<User | null>(null)
  const [ascents, setAscents] = useState<Ascent[]>([])
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [following, setFollowing] = useState(false)
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([])
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([])
  const [routeMap, setRouteMap] = useState<Record<string, Route>>({})
  const [allRoutes, setAllRoutes] = useState<Route[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [totalPoints, setTotalPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [profileTab, setProfileTab] = useState<'progress' | 'achievements' | 'ascents'>('progress')

  const targetId = userId ?? currentUser?.id

  useEffect(() => {
    async function load() {
      if (!targetId) return
      const [profileData, ascentsData, followers, followingData, allAch, userAch, routesData, zonesData, isFollowingResult] =
        await Promise.all([
          getUserProfile(targetId),
          getAscents(undefined, targetId),
          getFollowers(targetId),
          getFollowing(targetId),
          getAchievements(),
          getUserAchievements(targetId),
          getRoutes(),
          getZones(),
          currentUser && !isOwnProfile ? checkFollowing(currentUser.id, targetId) : Promise.resolve(false),
        ])
      setProfile(profileData)
      setAscents(ascentsData.ascents)
      setFollowersCount(followers.length)
      setFollowingCount(followingData.length)
      setFollowing(isFollowingResult)

      const unlockedIds = new Set(userAch.map((ua: UserAchievement) => ua.achievementId))
      setUnlockedAchievements(allAch.filter((a: Achievement) => unlockedIds.has(a.id)))
      setAllAchievements(allAch)

      // Calculate points
      const rMap: Record<string, Route> = {}
      for (const r of routesData.routes) rMap[r.id] = r
      setRouteMap(rMap)
      setAllRoutes(routesData.routes)
      setZones(zonesData)

      const ascendedRouteIds = new Set<string>()
      let ascentPts = 0
      for (const ascent of ascentsData.ascents) {
        if (ascendedRouteIds.has(ascent.routeId)) continue
        ascendedRouteIds.add(ascent.routeId)
        const route = rMap[ascent.routeId]
        if (route) ascentPts += calculateAscentPoints(route)
      }

      let achievementPts = 0
      for (const ach of allAch) {
        if (unlockedIds.has(ach.id)) achievementPts += ach.points ?? 0
      }
      setTotalPoints(ascentPts + achievementPts)

      setLoading(false)
    }
    load()
  }, [targetId, currentUser, isOwnProfile])

  async function toggleFollow() {
    if (!currentUser || !targetId) return
    if (following) {
      await unfollowUser(currentUser.id, targetId)
      setFollowersCount((c) => c - 1)
    } else {
      await followUser(currentUser.id, targetId)
      setFollowersCount((c) => c + 1)
    }
    setFollowing(!following)
  }

  async function handleDeleteAscent(ascentId: string) {
    await deleteAscent(ascentId)
    const newAscents = ascents.filter((x) => x.id !== ascentId)
    setAscents(newAscents)

    if (targetId) {
      await checkAchievements(targetId)
      const [allAch, userAch] = await Promise.all([
        getAchievements(),
        getUserAchievements(targetId),
      ])
      const unlockedIds = new Set(userAch.map((ua: UserAchievement) => ua.achievementId))
      setUnlockedAchievements(allAch.filter((a: Achievement) => unlockedIds.has(a.id)))
      setAllAchievements(allAch)

      const ascendedRouteIds = new Set<string>()
      let ascentPts = 0
      for (const asc of newAscents) {
        if (ascendedRouteIds.has(asc.routeId)) continue
        ascendedRouteIds.add(asc.routeId)
        const route = routeMap[asc.routeId]
        if (route) ascentPts += calculateAscentPoints(route)
      }
      let achievementPts = 0
      for (const ach of allAch) {
        if (unlockedIds.has(ach.id)) achievementPts += ach.points ?? 0
      }
      setTotalPoints(ascentPts + achievementPts)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  if (!profile) {
    return <p className="text-center text-gray-500 py-20">Usuario no encontrado</p>
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="card flex items-start gap-4">
        <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
          <UserIcon className="h-10 w-10" />
        </div>
        <div className="flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl font-bold">{profile.username}</h1>
            {isOwnProfile ? (
              <div className="flex gap-2">
                <Link to="/profile/edit" className="btn-secondary flex items-center gap-1 text-sm">
                  <Settings className="h-4 w-4" />
                  Editar
                </Link>
                <button onClick={() => signOut()} className="btn-danger text-sm">
                  Salir
                </button>
              </div>
            ) : (
              <button onClick={toggleFollow} className={cn(following ? 'btn-secondary' : 'btn-primary', 'flex items-center gap-1 w-fit')}>
                {following ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {following ? 'Dejar de seguir' : 'Seguir'}
              </button>
            )}
          </div>
          {profile.bio && <p className="text-sm text-gray-600 mt-1">{profile.bio}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm">
            <div>
              <span className="font-bold">{ascents.length}</span>{' '}
              <span className="text-gray-500">ascensiones</span>
            </div>
            <div>
              <span className="font-bold text-primary">{totalPoints}</span>{' '}
              <span className="text-gray-500">puntos</span>
            </div>
            <Link to={`/profile/${targetId}/followers`} className="hover:text-primary transition-colors">
              <span className="font-bold">{followersCount}</span>{' '}
              <span className="text-gray-500">seguidores</span>
            </Link>
            <Link to={`/profile/${targetId}/following`} className="hover:text-primary transition-colors">
              <span className="font-bold">{followingCount}</span>{' '}
              <span className="text-gray-500">siguiendo</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Profile tabs */}
      <div className="flex border-b border-gray-200 mt-6 mb-4">
        <button
          onClick={() => setProfileTab('progress')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
            profileTab === 'progress' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="h-4 w-4 flex-shrink-0" />
          Progreso
        </button>
        <button
          onClick={() => setProfileTab('achievements')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
            profileTab === 'achievements' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Trophy className="h-4 w-4 flex-shrink-0" />
          <span>Logros</span>
          <span className="text-xs text-gray-400 tabular-nums">({unlockedAchievements.length}/{allAchievements.length})</span>
        </button>
        <button
          onClick={() => setProfileTab('ascents')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors ${
            profileTab === 'ascents' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>Vías</span>
          <span className="text-xs text-gray-400 tabular-nums">({new Set(ascents.map(a => a.routeId)).size})</span>
        </button>
      </div>

      {/* Tab: Progress */}
      {profileTab === 'progress' && (() => {
        const completedRouteIds = new Set(ascents.map((a) => a.routeId))
        const completionPercent = allRoutes.length > 0 ? Math.round((completedRouteIds.size / allRoutes.length) * 100) : 0
        const zoneStats = zones.map((zone) => {
          const zoneRoutes = allRoutes.filter((r) => r.zoneId === zone.id)
          const completed = zoneRoutes.filter((r) => completedRouteIds.has(r.id)).length
          return { zone, total: zoneRoutes.length, completed }
        }).filter((s) => s.total > 0)
        return (
          <div className="card">
            <div className="mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Total</span>
                <span className="font-medium">{completedRouteIds.size}/{allRoutes.length} · {completionPercent}%</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>
            </div>
            <div className="space-y-3">
              {zoneStats.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Sin datos de zona</p>
              ) : zoneStats.map(({ zone, total, completed }) => (
                <div key={zone.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{zone.name}</span>
                    <span className="font-medium text-gray-700">{completed}/{total}</span>
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
        )
      })()}

      {/* Tab: Achievements */}
      {profileTab === 'achievements' && (() => {
        const climbedRouteIds = new Set(ascents.map((a) => a.routeId))
        const climbedZoneIds = new Set(
          [...climbedRouteIds].map((rid) => routeMap[rid]?.zoneId).filter(Boolean) as string[],
        )

        function getProgress(a: Achievement): { current: number; max: number } {
          if (a.type === 'ascent_count') {
            return { current: climbedRouteIds.size, max: a.threshold ?? 1 }
          }
          if (a.type === 'zone_count') {
            return { current: climbedZoneIds.size, max: a.threshold ?? 1 }
          }
          if (a.type === 'route_specific') {
            const needed = a.routeIds ?? []
            const done = needed.filter((id) => climbedRouteIds.has(id)).length
            return { current: done, max: needed.length }
          }
          if (a.type === 'all_routes') {
            return { current: climbedRouteIds.size, max: allRoutes.length }
          }
          return { current: 0, max: 1 }
        }

        return allAchievements.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay logros configurados</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {allAchievements.map((a) => {
              const unlocked = unlockedAchievements.some((u) => u.id === a.id)
              const { current, max } = getProgress(a)
              const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0
              return (
                <div
                  key={a.id}
                  className={`card text-center py-4 px-3 ${
                    unlocked ? 'bg-yellow-50 border-yellow-200' : 'opacity-60 grayscale'
                  }`}
                >
                  <span className="text-4xl block mb-2">{a.icon || '🏔️'}</span>
                  <p className="font-semibold text-sm leading-tight">{a.name}</p>
                  <p className="text-xs text-gray-500 mt-1 leading-snug">{a.description}</p>
                  {unlocked ? (
                    a.points > 0 && (
                      <p className="text-xs font-bold text-yellow-700 mt-2">+{a.points} pts</p>
                    )
                  ) : (
                    <div className="mt-3 px-1">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>{current}</span>
                        <span>{max}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* Tab: Ascents */}
      {profileTab === 'ascents' && (
        ascents.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Sin ascensiones registradas</p>
        ) : (
          <div className="space-y-2">
            {Object.values(
              ascents.reduce<Record<string, Ascent>>((acc, a) => {
                if (!acc[a.routeId] || (a.date?.seconds ?? 0) > (acc[a.routeId]!.date?.seconds ?? 0)) {
                  acc[a.routeId] = a
                }
                return acc
              }, {}),
            )
              .sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0))
              .map((a) => {
                const route = routeMap[a.routeId]
                return (
                  <div key={a.routeId} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <Link to={`/routes/${a.routeId}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <Mountain className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{route?.name ?? 'Vía desconocida'}</p>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {route?.difficulty.free && (
                              <span className="text-xs badge bg-blue-100 text-blue-800">Libre: {route.difficulty.free}</span>
                            )}
                            {route?.difficulty.mandatory && (
                              <span className="text-xs badge bg-orange-100 text-orange-800">Oblig: {route.difficulty.mandatory}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                      <div className="text-right flex-shrink-0">
                        {route && <p className="text-sm font-bold text-primary">{calculateAscentPoints(route)}</p>}
                        <p className="text-xs text-gray-400">pts</p>
                      </div>
                      {isOwnProfile && (
                        <button
                          onClick={() => handleDeleteAscent(a.id)}
                          className="text-gray-400 hover:text-danger transition-colors flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )
      )}
    </div>
  )
}
