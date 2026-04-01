import type { Achievement, Ascent, Route } from '@/models'

/**
 * Builds the sets of ascended route IDs and zone IDs from a list of ascents.
 * Handles duplicate ascents for the same route (each route counted once).
 */
export function buildAscendedSets(
  ascents: Pick<Ascent, 'routeId'>[],
  routes: Pick<Route, 'id' | 'zoneId'>[],
): { ascendedRouteIds: Set<string>; ascendedZoneIds: Set<string> } {
  const ascendedRouteIds = new Set(ascents.map((a) => a.routeId))
  const ascendedZoneIds = new Set(
    ascents
      .map((a) => routes.find((r) => r.id === a.routeId)?.zoneId)
      .filter((z): z is string => !!z),
  )
  return { ascendedRouteIds, ascendedZoneIds }
}

/**
 * Pure evaluation of whether an achievement's conditions are met.
 * No side effects — suitable for testing without Firebase.
 */
export function evaluateAchievement(
  achievement: Achievement,
  ascendedRouteIds: Set<string>,
  ascendedZoneIds: Set<string>,
  allRouteIds: string[],
): boolean {
  switch (achievement.type) {
    case 'ascent_count':
      return ascendedRouteIds.size >= (achievement.threshold ?? 0)
    case 'zone_count':
      return ascendedZoneIds.size >= (achievement.threshold ?? 0)
    case 'route_specific':
      return (achievement.routeIds ?? []).every((rid) => ascendedRouteIds.has(rid))
    case 'all_routes':
      return allRouteIds.length > 0 && allRouteIds.every((id) => ascendedRouteIds.has(id))
  }
}
