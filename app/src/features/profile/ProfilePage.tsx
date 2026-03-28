import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Settings, UserPlus, UserMinus, Mountain, Trophy, CheckCircle } from 'lucide-react'
import { useAuth } from '@/hooks'
import {
  getUserProfile,
  getAscents,
  getFollowers,
  getFollowing,
  isFollowing as checkFollowing,
  followUser,
  unfollowUser,
  getUserAchievements,
  getAchievements,
  getRoute,
  signOut,
} from '@/services/firebase'
import { Spinner } from '@/components'
import type { User, Ascent, Achievement, Route } from '@/models'

export function ProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()
  const isOwnProfile = !userId || userId === currentUser?.id

  const [profile, setProfile] = useState<User | null>(null)
  const [ascents, setAscents] = useState<Ascent[]>([])
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [following, setFollowing] = useState(false)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [routeMap, setRouteMap] = useState<Record<string, Route>>({})
  const [loading, setLoading] = useState(true)

  const targetId = userId ?? currentUser?.id

  useEffect(() => {
    async function load() {
      if (!targetId) return
      const [profileData, ascentsData, followers, followingData, allAchievements, userAchievements] =
        await Promise.all([
          getUserProfile(targetId),
          getAscents(undefined, targetId),
          getFollowers(targetId),
          getFollowing(targetId),
          getAchievements(),
          getUserAchievements(targetId),
        ])
      setProfile(profileData)
      setAscents(ascentsData.ascents)
      setFollowersCount(followers.length)
      setFollowingCount(followingData.length)

      const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId))
      setAchievements(allAchievements.filter((a) => unlockedIds.has(a.id)))

      // Resolve route names
      const routeIds = [...new Set(ascentsData.ascents.map((a) => a.routeId))]
      const routes = await Promise.all(routeIds.map((rid) => getRoute(rid)))
      const rMap: Record<string, Route> = {}
      for (const r of routes) {
        if (r) rMap[r.id] = r
      }
      setRouteMap(rMap)

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
      {achievements.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-secondary" />
            Logros
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {achievements.map((a) => (
              <div key={a.id} className="card bg-yellow-50 border-yellow-200">
                <p className="font-medium text-sm">{a.name}</p>
                <p className="text-xs text-gray-500">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  <Link key={a.routeId} to={`/routes/${a.routeId}`} className="card block hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
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
                      <div className="text-right flex-shrink-0">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {a.rating > 0 && <p className="text-xs text-gray-400 mt-0.5">{a.rating}/5</p>}
                      </div>
                    </div>
                  </Link>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
