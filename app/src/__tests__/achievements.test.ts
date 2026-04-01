import { describe, it, expect } from 'vitest'
import { evaluateAchievement, buildAscendedSets } from '../utils/achievements'
import type { Achievement } from '../models/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAchievement(overrides: Partial<Achievement>): Achievement {
  return {
    id: 'ach-1',
    name: 'Test Achievement',
    description: 'Test description',
    icon: '🏔️',
    type: 'ascent_count',
    points: 10,
    ...overrides,
  }
}

const ROUTES = [
  { id: 'r1', zoneId: 'z1' },
  { id: 'r2', zoneId: 'z1' },
  { id: 'r3', zoneId: 'z2' },
  { id: 'r4', zoneId: 'z2' },
  { id: 'r5', zoneId: 'z3' },
]

// ---------------------------------------------------------------------------
// buildAscendedSets
// ---------------------------------------------------------------------------

describe('buildAscendedSets', () => {
  it('returns empty sets for no ascents', () => {
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets([], ROUTES)
    expect(ascendedRouteIds.size).toBe(0)
    expect(ascendedZoneIds.size).toBe(0)
  })

  it('builds correct route IDs from ascents', () => {
    const { ascendedRouteIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r3' }],
      ROUTES,
    )
    expect(ascendedRouteIds).toEqual(new Set(['r1', 'r3']))
  })

  it('builds correct zone IDs from ascents', () => {
    const { ascendedZoneIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r3' }],
      ROUTES,
    )
    // r1 → z1, r3 → z2
    expect(ascendedZoneIds).toEqual(new Set(['z1', 'z2']))
  })

  it('deduplicates zones when multiple routes from same zone are ascended', () => {
    const { ascendedZoneIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r2' }], // both in z1
      ROUTES,
    )
    expect(ascendedZoneIds.size).toBe(1)
    expect(ascendedZoneIds.has('z1')).toBe(true)
  })

  it('deduplicates route IDs when same route ascended multiple times', () => {
    const { ascendedRouteIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r1' }, { routeId: 'r1' }],
      ROUTES,
    )
    expect(ascendedRouteIds.size).toBe(1)
  })

  it('ignores routes not found in the route list', () => {
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      [{ routeId: 'unknown-route' }],
      ROUTES,
    )
    expect(ascendedRouteIds.has('unknown-route')).toBe(true) // route ID is tracked
    expect(ascendedZoneIds.size).toBe(0) // but no zone found
  })

  it('handles all routes ascended', () => {
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      ROUTES.map((r) => ({ routeId: r.id })),
      ROUTES,
    )
    expect(ascendedRouteIds.size).toBe(5)
    expect(ascendedZoneIds.size).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// evaluateAchievement — ascent_count
// ---------------------------------------------------------------------------

describe('evaluateAchievement: ascent_count', () => {
  const allRouteIds = ROUTES.map((r) => r.id)

  it('returns false when user has fewer ascents than threshold', () => {
    const ach = makeAchievement({ type: 'ascent_count', threshold: 3 })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r2' }],
      ROUTES,
    )
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(false)
  })

  it('returns true when user has exactly threshold ascents', () => {
    const ach = makeAchievement({ type: 'ascent_count', threshold: 2 })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r2' }],
      ROUTES,
    )
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(true)
  })

  it('returns true when user has more ascents than threshold', () => {
    const ach = makeAchievement({ type: 'ascent_count', threshold: 2 })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      ROUTES.map((r) => ({ routeId: r.id })),
      ROUTES,
    )
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(true)
  })

  it('threshold 0 is always completed', () => {
    const ach = makeAchievement({ type: 'ascent_count', threshold: 0 })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets([], ROUTES)
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(true)
  })

  it('counts distinct routes (duplicates do not add up)', () => {
    const ach = makeAchievement({ type: 'ascent_count', threshold: 2 })
    // Same route ascended 5 times — still counts as 1 distinct route
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      Array(5).fill({ routeId: 'r1' }),
      ROUTES,
    )
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(false)
  })

  it('missing threshold defaults to 0 (always completed)', () => {
    const ach = makeAchievement({ type: 'ascent_count' }) // no threshold field
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets([], ROUTES)
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// evaluateAchievement — zone_count
// ---------------------------------------------------------------------------

describe('evaluateAchievement: zone_count', () => {
  const allRouteIds = ROUTES.map((r) => r.id)

  it('returns false when fewer distinct zones than threshold', () => {
    const ach = makeAchievement({ type: 'zone_count', threshold: 3 })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r2' }], // both zone z1 → 1 zone
      ROUTES,
    )
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(false)
  })

  it('returns true when exactly threshold zones visited', () => {
    const ach = makeAchievement({ type: 'zone_count', threshold: 2 })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r3' }], // z1 + z2
      ROUTES,
    )
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(true)
  })

  it('multiple routes in same zone count as 1 zone', () => {
    const ach = makeAchievement({ type: 'zone_count', threshold: 2 })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r2' }], // both z1 → only 1 zone
      ROUTES,
    )
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(false)
  })

  it('returns true when all 3 zones visited', () => {
    const ach = makeAchievement({ type: 'zone_count', threshold: 3 })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r3' }, { routeId: 'r5' }],
      ROUTES,
    )
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// evaluateAchievement — route_specific
// ---------------------------------------------------------------------------

describe('evaluateAchievement: route_specific', () => {
  const allRouteIds = ROUTES.map((r) => r.id)

  it('returns false when none of the required routes are ascended', () => {
    const ach = makeAchievement({ type: 'route_specific', routeIds: ['r1', 'r2'] })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets([], ROUTES)
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(false)
  })

  it('returns false when only some required routes are ascended', () => {
    const ach = makeAchievement({ type: 'route_specific', routeIds: ['r1', 'r2', 'r3'] })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r2' }],
      ROUTES,
    )
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(false)
  })

  it('returns true when all required routes are ascended', () => {
    const ach = makeAchievement({ type: 'route_specific', routeIds: ['r1', 'r2'] })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r2' }],
      ROUTES,
    )
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(true)
  })

  it('returns true even if user ascended extra routes beyond required', () => {
    const ach = makeAchievement({ type: 'route_specific', routeIds: ['r1'] })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      ROUTES.map((r) => ({ routeId: r.id })),
      ROUTES,
    )
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(true)
  })

  it('empty routeIds list is always completed', () => {
    const ach = makeAchievement({ type: 'route_specific', routeIds: [] })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets([], ROUTES)
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(true)
  })

  it('missing routeIds defaults to empty (always completed)', () => {
    const ach = makeAchievement({ type: 'route_specific' }) // no routeIds
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets([], ROUTES)
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// evaluateAchievement — all_routes
// ---------------------------------------------------------------------------

describe('evaluateAchievement: all_routes', () => {
  it('returns false when no routes ascended', () => {
    const ach = makeAchievement({ type: 'all_routes' })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets([], ROUTES)
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, ['r1', 'r2', 'r3'])).toBe(false)
  })

  it('returns false when only some routes ascended', () => {
    const ach = makeAchievement({ type: 'all_routes' })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r2' }],
      ROUTES,
    )
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, ['r1', 'r2', 'r3'])).toBe(false)
  })

  it('returns true when every route in the system has been ascended', () => {
    const ach = makeAchievement({ type: 'all_routes' })
    const allRouteIds = ['r1', 'r2', 'r3']
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r2' }, { routeId: 'r3' }],
      ROUTES,
    )
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, allRouteIds)).toBe(true)
  })

  it('returns false when system has no routes (safety guard)', () => {
    const ach = makeAchievement({ type: 'all_routes' })
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets([], [])
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, [])).toBe(false)
  })

  it('adding a new route takes the achievement away until that route is also ascended', () => {
    const ach = makeAchievement({ type: 'all_routes' })
    // Previously: r1 + r2 were all routes
    const { ascendedRouteIds, ascendedZoneIds } = buildAscendedSets(
      [{ routeId: 'r1' }, { routeId: 'r2' }],
      ROUTES,
    )
    // Now there are 3 routes in the system
    expect(evaluateAchievement(ach, ascendedRouteIds, ascendedZoneIds, ['r1', 'r2', 'r3'])).toBe(false)
  })
})
