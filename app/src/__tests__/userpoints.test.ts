import { describe, it, expect } from 'vitest'
import { calculateUserTotalPoints } from '../utils/points'
import type { Route, Achievement } from '../models/types'
import { Timestamp } from 'firebase/firestore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRoute(id: string, freeGrade: string, length: number): Route {
  return {
    id,
    name: `Route ${id}`,
    zoneId: 'z1',
    wallId: 'w1',
    description: '',
    difficulty: { free: freeGrade, mandatory: '', aid: '' },
    length,
    images: [],
    externalLinks: [],
    createdAt: Timestamp.now(),
  }
}

function makeAchievement(id: string, points: number): Achievement {
  return {
    id,
    name: `Achievement ${id}`,
    description: '',
    icon: '',
    type: 'ascent_count',
    threshold: 1,
    points,
  }
}

function routeMap(...routes: Route[]): Map<string, Route> {
  return new Map(routes.map((r) => [r.id, r]))
}

// ---------------------------------------------------------------------------
// calculateUserTotalPoints
// ---------------------------------------------------------------------------

describe('calculateUserTotalPoints', () => {
  describe('ascentPoints', () => {
    it('returns 0 for empty ascents', () => {
      const result = calculateUserTotalPoints([], new Map(), [], new Set())
      expect(result.ascentPoints).toBe(0)
      expect(result.total).toBe(0)
    })

    it('calculates points for a single ascent', () => {
      // 6a = 30pts + 100m * 0.1 = 10pts → 40pts
      const result = calculateUserTotalPoints(
        [{ routeId: 'r1' }],
        routeMap(makeRoute('r1', '6a', 100)),
        [],
        new Set(),
      )
      expect(result.ascentPoints).toBe(40)
    })

    it('counts each route only once even if ascended multiple times', () => {
      // r1 = 6a 100m = 40pts. Ascending it 3× still counts as 40pts.
      const result = calculateUserTotalPoints(
        [{ routeId: 'r1' }, { routeId: 'r1' }, { routeId: 'r1' }],
        routeMap(makeRoute('r1', '6a', 100)),
        [],
        new Set(),
      )
      expect(result.ascentPoints).toBe(40)
    })

    it('sums points across multiple distinct routes', () => {
      // r1: 6a 0m = 30pts, r2: 7a 0m = 65pts → 95pts
      const result = calculateUserTotalPoints(
        [{ routeId: 'r1' }, { routeId: 'r2' }],
        routeMap(makeRoute('r1', '6a', 0), makeRoute('r2', '7a', 0)),
        [],
        new Set(),
      )
      expect(result.ascentPoints).toBe(95)
    })

    it('gives 0 points for a route not found in routeMap', () => {
      const result = calculateUserTotalPoints(
        [{ routeId: 'unknown' }],
        new Map(),
        [],
        new Set(),
      )
      expect(result.ascentPoints).toBe(0)
    })

    it('skips unknown routes but still counts known ones', () => {
      // r1 = 6a 0m = 30pts, 'ghost' = not in map = 0pts
      const result = calculateUserTotalPoints(
        [{ routeId: 'r1' }, { routeId: 'ghost' }],
        routeMap(makeRoute('r1', '6a', 0)),
        [],
        new Set(),
      )
      expect(result.ascentPoints).toBe(30)
    })

    it('applies length bonus correctly', () => {
      // 6b = 40pts + floor(350 * 0.1) = 35pts → 75pts
      const result = calculateUserTotalPoints(
        [{ routeId: 'r1' }],
        routeMap(makeRoute('r1', '6b', 350)),
        [],
        new Set(),
      )
      expect(result.ascentPoints).toBe(75)
    })
  })

  describe('achievementPoints', () => {
    it('returns 0 when no achievements unlocked', () => {
      const achievements = [makeAchievement('a1', 50), makeAchievement('a2', 100)]
      const result = calculateUserTotalPoints([], new Map(), achievements, new Set())
      expect(result.achievementPoints).toBe(0)
    })

    it('sums points of unlocked achievements', () => {
      const achievements = [makeAchievement('a1', 50), makeAchievement('a2', 100)]
      const result = calculateUserTotalPoints([], new Map(), achievements, new Set(['a1', 'a2']))
      expect(result.achievementPoints).toBe(150)
    })

    it('only counts unlocked achievements', () => {
      const achievements = [makeAchievement('a1', 50), makeAchievement('a2', 100)]
      const result = calculateUserTotalPoints([], new Map(), achievements, new Set(['a1']))
      expect(result.achievementPoints).toBe(50)
    })

    it('skips achievements with 0 points', () => {
      const achievements = [makeAchievement('a1', 0), makeAchievement('a2', 25)]
      const result = calculateUserTotalPoints([], new Map(), achievements, new Set(['a1', 'a2']))
      expect(result.achievementPoints).toBe(25)
    })
  })

  describe('total', () => {
    it('is the sum of ascentPoints and achievementPoints', () => {
      // r1: 6a 100m = 40pts ascent, a1: 60pts achievement → total 100
      const result = calculateUserTotalPoints(
        [{ routeId: 'r1' }],
        routeMap(makeRoute('r1', '6a', 100)),
        [makeAchievement('a1', 60)],
        new Set(['a1']),
      )
      expect(result.ascentPoints).toBe(40)
      expect(result.achievementPoints).toBe(60)
      expect(result.total).toBe(100)
    })

    it('is consistent: total === ascentPoints + achievementPoints', () => {
      const routes = [makeRoute('r1', '7b', 500), makeRoute('r2', '6c+', 200)]
      const achievements = [makeAchievement('a1', 100), makeAchievement('a2', 200), makeAchievement('a3', 50)]
      const rMap = routeMap(...routes)
      const result = calculateUserTotalPoints(
        routes.map((r) => ({ routeId: r.id })),
        rMap,
        achievements,
        new Set(['a1', 'a3']),
      )
      expect(result.total).toBe(result.ascentPoints + result.achievementPoints)
    })
  })

  describe('ranking ordering', () => {
    it('higher grade + longer route gives more points than lower grade shorter route', () => {
      const hard = calculateUserTotalPoints(
        [{ routeId: 'hard' }],
        routeMap(makeRoute('hard', '8a', 500)),
        [],
        new Set(),
      )
      const easy = calculateUserTotalPoints(
        [{ routeId: 'easy' }],
        routeMap(makeRoute('easy', 'III', 50)),
        [],
        new Set(),
      )
      expect(hard.total).toBeGreaterThan(easy.total)
    })

    it('same routes: more achievements gives higher total', () => {
      const rMap = routeMap(makeRoute('r1', '6a', 0))
      const achievements = [makeAchievement('a1', 50), makeAchievement('a2', 100)]

      const withBoth = calculateUserTotalPoints([{ routeId: 'r1' }], rMap, achievements, new Set(['a1', 'a2']))
      const withOne = calculateUserTotalPoints([{ routeId: 'r1' }], rMap, achievements, new Set(['a1']))

      expect(withBoth.total).toBeGreaterThan(withOne.total)
    })
  })
})
