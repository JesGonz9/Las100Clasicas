import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, UserMinus } from 'lucide-react'
import { useAuth } from '@/hooks'
import {
  getFollowers,
  getFollowing,
  getUserProfile,
  followUser,
  unfollowUser,
} from '@/services/firebase'
import { Spinner } from '@/components'
import type { User } from '@/models'

export function FollowListPage() {
  const { userId, type } = useParams<{ userId: string; type: 'followers' | 'following' }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!userId || !type) return

      const follows = type === 'followers' ? await getFollowers(userId) : await getFollowing(userId)
      const targetIds = follows.map((f) => (type === 'followers' ? f.followerId : f.followingId))

      const profiles = await Promise.all(targetIds.map((id) => getUserProfile(id)))
      setUsers(profiles.filter((p): p is User => p !== null))

      // Check which ones the current user follows
      if (currentUser) {
        const myFollowing = await getFollowing(currentUser.id)
        setFollowingIds(new Set(myFollowing.map((f) => f.followingId)))
      }

      setLoading(false)
    }
    load()
  }, [userId, type, currentUser])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      <h1 className="text-2xl font-bold mb-4">
        {type === 'followers' ? 'Seguidores' : 'Siguiendo'}
      </h1>

      {users.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          {type === 'followers' ? 'Aún no tiene seguidores' : 'Aún no sigue a nadie'}
        </p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="card flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
                {u.username[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/profile/${u.id}`} className="text-sm font-medium hover:text-primary truncate block">
                  {u.username}
                </Link>
                {u.bio && <p className="text-xs text-gray-500 truncate">{u.bio}</p>}
              </div>
              {currentUser && u.id !== currentUser.id && (
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
