type DateLike = { seconds?: number } | null | undefined

export type AscentLike = { id: string; routeId: string; date?: DateLike }

/**
 * Deduplicates ascents keeping only the latest per route,
 * then sorts the result by date descending.
 * Mirrors the logic used in ProfilePage and SocialPage.
 */
export function deduplicateAscentsKeepLatest<T extends AscentLike>(ascents: T[]): T[] {
  const map: Record<string, T> = {}
  for (const a of ascents) {
    const existing = map[a.routeId]
    if (!existing || (a.date?.seconds ?? 0) > (existing.date?.seconds ?? 0)) {
      map[a.routeId] = a
    }
  }
  return Object.values(map).sort(
    (a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0),
  )
}

/**
 * Sorts ascents by date descending (most recent first).
 */
export function sortAscentsByDateDesc<T extends { date?: DateLike }>(ascents: T[]): T[] {
  return [...ascents].sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0))
}
