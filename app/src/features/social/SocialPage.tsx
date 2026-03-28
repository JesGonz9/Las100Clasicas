import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, UserPlus, UserMinus, Users } from 'lucide-react'
import { useAuth } from '@/hooks'
import {
  searchUsers,
  getFollowing,
  getAscents,
  followUser,
  unfollowUser,
  getUserProfile,
  getRoute,
} from '@/services/firebase'
import { Spinner, EmptyState } from '@/components'
import type { User, Ascent, Route } from '@/models'

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
  const [tab, setTab] = useState<'feed' | 'search'>('feed')

  // Load following IDs and feed
  useEffect(() => {
    async function load() {
      if (!currentUser) return
      const following = await getFollowing(currentUser.id)
      const ids = new Set(following.map((f) => f.followingId))
      setFollowingIds(ids)

      // Build feed from followed users' ascents
      const feedItems: FeedItem[] = []
      for (const uid of ids) {
        const [profile, ascentsData] = await Promise.all([
          getUserProfile(uid),
          getAscents(undefined, uid),
        ])
        if (profile) {
          for (const ascent of ascentsData.ascents) {
            const route = await getRoute(ascent.routeId)
            feedItems.push({ ascent, user: profile, route })
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
      <h1 className="text-2xl font-bold mb-4">Social</h1>

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
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
                    {u.username[0]?.toUpperCase()}
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
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                      {item.user.username[0]?.toUpperCase()}
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
    </div>
  )
}
