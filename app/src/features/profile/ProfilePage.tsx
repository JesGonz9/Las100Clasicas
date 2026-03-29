import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Settings, UserPlus, UserMinus, Mountain, Trophy, CheckCircle, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks'
import {
  getUserProfile,
  getAscents,
  deleteAscent,
  getFollowers,
  getFollowing,
  isFollowing as checkFollowing,
  followUser,
  unfollowUser,
  getUserAchievements,
  getAchievements,
  getRoute,
  getRoutes,
  signOut,
} from '@/services/firebase'
import { Spinner } from '@/components'
import { calculateAscentPoints } from '@/utils'
import type { User, Ascent, Achievement, UserAchievement, Route } from '@/models'

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
  const [totalPoints, setTotalPoints] = useState(0)
  const [loading, setLoading] = useState(true)

  const targetId = userId ?? currentUser?.id

  useEffect(() => {
    async function load() {
      if (!targetId) return
      const [profileData, ascentsData, followers, followingData, allAch, userAch, routesData] =
        await Promise.all([
          getUserProfile(targetId),
          getAscents(undefined, targetId),
          getFollowers(targetId),
          getFollowing(targetId),
          getAchievements(),
          getUserAchievements(targetId),
          getRoutes(),
        ])
      setProfile(profileData)
      setAscents(ascentsData.ascents)
      setFollowersCount(followers.length)
      setFollowingCount(followingData.length)

      const unlockedIds = new Set(userAch.map((ua: UserAchievement) => ua.achievementId))
      setUnlockedAchievements(allAch.filter((a: Achievement) => unlockedIds.has(a.id)))
      setAllAchievements(allAch)

      // Calculate points
      const rMap: Record<string, Route> = {}
      for (const r of routesData.routes) rMap[r.id] = r
      setRouteMap(rMap)

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

      if (currentUser && !isOwnProfile) {
        const isF = await checkFollowing(currentUser.id, targetId)
        setFollowing(isF)
      }
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
        {profile.photoURL ? (
          <img src={profile.photoURL} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
            {profile.username[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between">
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
              <button onClick={toggleFollow} className={following ? 'btn-secondary flex items-center gap-1' : 'btn-primary flex items-center gap-1'}>
                {following ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {following ? 'Dejar de seguir' : 'Seguir'}
              </button>
            )}
          </div>
          {profile.bio && <p className="text-sm text-gray-600 mt-1">{profile.bio}</p>}
          <div className="flex gap-6 mt-3 text-sm">
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

      {/* Achievements */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-secondary" />
          Logros ({unlockedAchievements.length}/{allAchievements.length})
        </h2>
        {allAchievements.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No hay logros configurados</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {allAchievements.map((a) => {
              const unlocked = unlockedAchievements.some((u) => u.id === a.id)
              return (
                <div key={a.id} className={`card ${unlocked ? 'bg-yellow-50 border-yellow-200' : 'opacity-50 grayscale'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{a.icon || '🏔️'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{a.name}</p>
                      <p className="text-xs text-gray-500 truncate">{a.description}</p>
                    </div>
                  </div>
                  {unlocked && a.points > 0 && (
                    <p className="text-xs font-medium text-yellow-700 mt-1">+{a.points} pts</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Ascended routes */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Vías ascendidas ({ascents.length})
        </h2>
        {ascents.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Sin ascensiones registradas</p>
        ) : (
          <div className="space-y-2">
            {/* Deduplicate by routeId showing latest ascent per route */}
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
                          onClick={async () => {
                            await deleteAscent(a.id)
                            setAscents((prev) => prev.filter((x) => x.id !== a.id))
                          }}
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
        )}
      </div>
    </div>
  )
}
