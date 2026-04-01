import { describe, it, expect } from 'vitest'
import { getGradePoints, calculateAscentPoints } from '../utils/points'
import type { Route } from '../models/types'
import { Timestamp } from 'firebase/firestore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRoute(overrides: Partial<Route> & { id: string }): Route {
  return {
    name: `Route ${overrides.id}`,
    zoneId: 'z1',
    wallId: 'w1',
    description: '',
    difficulty: { free: '', mandatory: '', aid: '' },
    length: 0,
    images: [],
    externalLinks: [],
    createdAt: Timestamp.now(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// getGradePoints
// ---------------------------------------------------------------------------

describe('getGradePoints', () => {
  describe('known grades', () => {
    it.each([
      ['III', 5],
      ['IV', 10],
      ['IV+', 15],
      ['V', 20],
      ['V+', 25],
      ['6a', 30],
      ['6a+', 35],
      ['6b', 40],
      ['6b+', 45],
      ['6c', 50],
      ['6c+', 55],
      ['7a', 65],
      ['7a+', 75],
      ['7b', 85],
      ['7b+', 95],
      ['7c', 110],
      ['7c+', 125],
      ['8a', 145],
    ])('grade %s → %i points', (grade, expected) => {
      expect(getGradePoints(grade)).toBe(expected)
    })
  })

  describe('case-insensitive matching', () => {
    it('matches "6A" as "6a"', () => {
      expect(getGradePoints('6A')).toBe(30)
    })

    it('matches "7B+" as "7b+"', () => {
      expect(getGradePoints('7B+')).toBe(95)
    })

    it('matches "iii" as "III"', () => {
      expect(getGradePoints('iii')).toBe(5)
    })
  })

  describe('whitespace handling', () => {
    it('trims leading and trailing spaces', () => {
      expect(getGradePoints('  6b  ')).toBe(40)
    })
  })

  describe('unknown or empty grades', () => {
    it('returns 0 for empty string', () => {
      expect(getGradePoints('')).toBe(0)
    })

    it('returns 0 for whitespace-only string', () => {
      expect(getGradePoints('   ')).toBe(0)
    })

    it('returns default 10 for an unrecognised grade string', () => {
      expect(getGradePoints('9c')).toBe(10)
    })

    it('returns default 10 for gibberish', () => {
      expect(getGradePoints('xyz')).toBe(10)
    })
  })

  describe('grade ordering sanity', () => {
    it('harder grades give more points than easier ones', () => {
      expect(getGradePoints('8a')).toBeGreaterThan(getGradePoints('7c+'))
      expect(getGradePoints('7c+')).toBeGreaterThan(getGradePoints('7c'))
      expect(getGradePoints('7c')).toBeGreaterThan(getGradePoints('7b+'))
      expect(getGradePoints('6a')).toBeGreaterThan(getGradePoints('V+'))
      expect(getGradePoints('V+')).toBeGreaterThan(getGradePoints('V'))
      expect(getGradePoints('V')).toBeGreaterThan(getGradePoints('IV+'))
    })
  })
})

// ---------------------------------------------------------------------------
// calculateAscentPoints
// ---------------------------------------------------------------------------

describe('calculateAscentPoints', () => {
  it('returns grade points only when length is 0', () => {
    const route = makeRoute({ id: 'r1', difficulty: { free: '6a', mandatory: '', aid: '' }, length: 0 })
    expect(calculateAscentPoints(route)).toBe(30)
  })

  it('adds floor(length * 0.1) as length bonus', () => {
    // 6b = 40pts + floor(350 * 0.1) = 35 → 75
    const route = makeRoute({ id: 'r1', difficulty: { free: '6b', mandatory: '', aid: '' }, length: 350 })
    expect(calculateAscentPoints(route)).toBe(75)
  })

  it('floors the length bonus (no decimals)', () => {
    // 7a = 65pts + floor(15 * 0.1) = floor(1.5) = 1 → 66
    const route = makeRoute({ id: 'r1', difficulty: { free: '7a', mandatory: '', aid: '' }, length: 15 })
    expect(calculateAscentPoints(route)).toBe(66)
  })

  it('returns 0 grade points for empty difficulty', () => {
    const route = makeRoute({ id: 'r1', difficulty: { free: '', mandatory: '', aid: '' }, length: 0 })
    expect(calculateAscentPoints(route)).toBe(0)
  })

  it('uses the free grade only (ignores mandatory and aid)', () => {
    const route = makeRoute({
      id: 'r1',
      difficulty: { free: '6c', mandatory: 'A2', aid: 'VI' },
      length: 0,
    })
    expect(calculateAscentPoints(route)).toBe(50)
  })

  it('correctly handles a long route with a hard grade', () => {
    // 8a = 145pts + floor(500 * 0.1) = 50 → 195
    const route = makeRoute({ id: 'r1', difficulty: { free: '8a', mandatory: '', aid: '' }, length: 500 })
    expect(calculateAscentPoints(route)).toBe(195)
  })

  it('handles undefined length as 0', () => {
    const route = makeRoute({ id: 'r1', difficulty: { free: '6a', mandatory: '', aid: '' } })
    // length defaults to 0 in makeRoute
    expect(calculateAscentPoints(route)).toBe(30)
  })

  describe('longer routes always score higher for the same grade', () => {
    it('200m route beats 100m route at the same grade', () => {
      const long = makeRoute({ id: 'l', difficulty: { free: '7a', mandatory: '', aid: '' }, length: 200 })
      const short = makeRoute({ id: 's', difficulty: { free: '7a', mandatory: '', aid: '' }, length: 100 })
      expect(calculateAscentPoints(long)).toBeGreaterThan(calculateAscentPoints(short))
    })
  })
})
