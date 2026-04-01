/**
 * Simple in-memory TTL cache for static collections (routes, zones, walls, achievements).
 * These collections only change when an admin performs a mutation, so we invalidate
 * the relevant cache entries after each write operation.
 *
 * Default TTL: 10 minutes (failsafe against stale data if invalidation is missed).
 */

const TTL_MS = 10 * 60 * 1000 // 10 minutes

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.data
}

export function cacheSet<T>(key: string, data: T): void {
  store.set(key, { data, expiresAt: Date.now() + TTL_MS })
}

export function cacheInvalidate(...keys: string[]): void {
  for (const key of keys) store.delete(key)
}

// Key constants — use these everywhere to avoid typos
export const CACHE_KEYS = {
  zones: 'zones',
  walls: 'walls',
  achievements: 'achievements',
  routes: (zoneId?: string) => (zoneId ? `routes:zone=${zoneId}` : 'routes'),
}
