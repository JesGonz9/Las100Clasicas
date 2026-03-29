import { describe, it, expect } from 'vitest'
import { getGradePoints, calculateAscentPoints } from '../utils/points'
import type { Route } from '../models/types'
import { Timestamp } from 'firebase/firestore'

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: 'test-route',
    name: 'Test Route',
    zoneId: 'zone-1',
    wallId: 'wall-1',
    description: '',
    difficulty: { free: '', mandatory: '', aid: '' },
    length: 0,
    images: [],
    externalLinks: [],
    createdAt: Timestamp.now(),
    ...overrides,
  }
}

// =============================================
// getGradePoints
// =============================================
describe('getGradePoints', () => {
  describe('returns correct points for each grade', () => {
    const cases: [string, number][] = [
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
    ]

    it.each(cases)('grade %s → %d points', (grade, expected) => {
      expect(getGradePoints(grade)).toBe(expected)
    })
  })

  describe('case insensitivity', () => {
    it('handles lowercase input', () => {
      expect(getGradePoints('iii')).toBe(5)
      expect(getGradePoints('iv+')).toBe(15)
      expect(getGradePoints('v')).toBe(20)
    })

    it('handles uppercase input', () => {
      expect(getGradePoints('6A')).toBe(30)
      expect(getGradePoints('6A+')).toBe(35)
      expect(getGradePoints('7C+')).toBe(125)
    })

    it('handles mixed case', () => {
      expect(getGradePoints('6B+')).toBe(45)
      expect(getGradePoints('8A')).toBe(145)
    })
  })

  describe('whitespace handling', () => {
    it('trims leading/trailing spaces', () => {
      expect(getGradePoints('  6a  ')).toBe(30)
      expect(getGradePoints(' 7b+ ')).toBe(95)
    })

    it('trims tabs', () => {
      expect(getGradePoints('\t8a\t')).toBe(145)
    })
  })

  describe('edge cases', () => {
    it('returns 0 for empty string', () => {
      expect(getGradePoints('')).toBe(0)
    })

    it('returns 10 (default) for unknown grade', () => {
      expect(getGradePoints('9a')).toBe(10)
      expect(getGradePoints('unknown')).toBe(10)
      expect(getGradePoints('8b')).toBe(10)
      expect(getGradePoints('abc')).toBe(10)
    })

    it('returns 0 for only whitespace', () => {
      expect(getGradePoints('   ')).toBe(0)
    })
  })

  describe('progression is monotonically increasing', () => {
    const grades = ['III', 'IV', 'IV+', 'V', 'V+', '6a', '6a+', '6b', '6b+', '6c', '6c+', '7a', '7a+', '7b', '7b+', '7c', '7c+', '8a']

    it('each grade gives more points than the previous', () => {
      for (let i = 1; i < grades.length; i++) {
        const prev = getGradePoints(grades[i - 1]!)
        const curr = getGradePoints(grades[i]!)
        expect(curr).toBeGreaterThan(prev)
      }
    })
  })

  describe('max grade is 8a', () => {
    it('8a is the highest defined grade at 145 points', () => {
      expect(getGradePoints('8a')).toBe(145)
    })

    it('grades above 8a fall back to default', () => {
      expect(getGradePoints('8a+')).toBe(10)
      expect(getGradePoints('8b')).toBe(10)
      expect(getGradePoints('9a')).toBe(10)
    })
  })
})

// =============================================
// calculateAscentPoints
// =============================================
describe('calculateAscentPoints', () => {
  describe('grade points only (no length)', () => {
    it('calculates points for a route with grade but 0 length', () => {
      const route = makeRoute({ difficulty: { free: '6a', mandatory: '', aid: '' }, length: 0 })
      expect(calculateAscentPoints(route)).toBe(30)
    })

    it('calculates points for the hardest grade', () => {
      const route = makeRoute({ difficulty: { free: '8a', mandatory: '', aid: '' }, length: 0 })
      expect(calculateAscentPoints(route)).toBe(145)
    })

    it('calculates points for the easiest grade', () => {
      const route = makeRoute({ difficulty: { free: 'III', mandatory: '', aid: '' }, length: 0 })
      expect(calculateAscentPoints(route)).toBe(5)
    })
  })

  describe('length bonus', () => {
    it('adds 0.1 points per meter (floored)', () => {
      const route = makeRoute({ difficulty: { free: '6a', mandatory: '', aid: '' }, length: 300 })
      // 30 (grade) + 30 (300 * 0.1)
      expect(calculateAscentPoints(route)).toBe(60)
    })

    it('floors the length bonus', () => {
      const route = makeRoute({ difficulty: { free: '6a', mandatory: '', aid: '' }, length: 155 })
      // 30 (grade) + 15 (floor(155 * 0.1))
      expect(calculateAscentPoints(route)).toBe(45)
    })

    it('handles large lengths', () => {
      const route = makeRoute({ difficulty: { free: '7a', mandatory: '', aid: '' }, length: 800 })
      // 65 (grade) + 80 (800 * 0.1)
      expect(calculateAscentPoints(route)).toBe(145)
    })

    it('gives 0 length bonus for 0m', () => {
      const route = makeRoute({ difficulty: { free: '7b', mandatory: '', aid: '' }, length: 0 })
      expect(calculateAscentPoints(route)).toBe(85)
    })

    it('gives 0 length bonus for very short routes', () => {
      const route = makeRoute({ difficulty: { free: 'V', mandatory: '', aid: '' }, length: 5 })
      // 20 (grade) + 0 (floor(5 * 0.1) = 0)
      expect(calculateAscentPoints(route)).toBe(20)
    })
  })

  describe('combined grade + length', () => {
    it('classic route: 6b+ 400m', () => {
      const route = makeRoute({ difficulty: { free: '6b+', mandatory: '', aid: '' }, length: 400 })
      // 45 + 40 = 85
      expect(calculateAscentPoints(route)).toBe(85)
    })

    it('hard long route: 7c+ 600m', () => {
      const route = makeRoute({ difficulty: { free: '7c+', mandatory: '', aid: '' }, length: 600 })
      // 125 + 60 = 185
      expect(calculateAscentPoints(route)).toBe(185)
    })

    it('easy short route: III 50m', () => {
      const route = makeRoute({ difficulty: { free: 'III', mandatory: '', aid: '' }, length: 50 })
      // 5 + 5 = 10
      expect(calculateAscentPoints(route)).toBe(10)
    })

    it('max grade max length: 8a 1000m', () => {
      const route = makeRoute({ difficulty: { free: '8a', mandatory: '', aid: '' }, length: 1000 })
      // 145 + 100 = 245
      expect(calculateAscentPoints(route)).toBe(245)
    })
  })

  describe('edge cases', () => {
    it('unknown grade with length still gives length bonus + default', () => {
      const route = makeRoute({ difficulty: { free: 'unknown', mandatory: '', aid: '' }, length: 200 })
      // 10 (default) + 20 (200 * 0.1)
      expect(calculateAscentPoints(route)).toBe(30)
    })

    it('empty grade with length gives only length bonus', () => {
      const route = makeRoute({ difficulty: { free: '', mandatory: '', aid: '' }, length: 500 })
      // 0 (empty) + 50 (500 * 0.1)
      expect(calculateAscentPoints(route)).toBe(50)
    })

    it('only uses free difficulty, ignores mandatory and aid', () => {
      const route = makeRoute({ difficulty: { free: '6a', mandatory: '7a', aid: 'A2' }, length: 100 })
      // 30 (6a only) + 10
      expect(calculateAscentPoints(route)).toBe(40)
    })
  })
})
