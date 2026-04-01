import { describe, it, expect } from 'vitest'
import { deduplicateAscentsKeepLatest, sortAscentsByDateDesc } from '../utils/ascents'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SimpleAscent = {
  id: string
  routeId: string
  date: { seconds: number; nanoseconds: number }
}

function makeAscent(id: string, routeId: string, seconds: number): SimpleAscent {
  return { id, routeId, date: { seconds, nanoseconds: 0 } }
}

// ---------------------------------------------------------------------------
// deduplicateAscentsKeepLatest
// ---------------------------------------------------------------------------

describe('deduplicateAscentsKeepLatest', () => {
  it('returns empty array for empty input', () => {
    expect(deduplicateAscentsKeepLatest([])).toEqual([])
  })

  it('returns single ascent unchanged', () => {
    const a = makeAscent('a1', 'r1', 100)
    expect(deduplicateAscentsKeepLatest([a])).toEqual([a])
  })

  it('keeps only the latest ascent per route when there are duplicates', () => {
    const older = makeAscent('a1', 'r1', 100)
    const newer = makeAscent('a2', 'r1', 200)
    const result = deduplicateAscentsKeepLatest([older, newer])
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('a2')
  })

  it('keeps the latest even when input is in reverse chronological order', () => {
    const newest = makeAscent('a3', 'r1', 300)
    const middle = makeAscent('a2', 'r1', 200)
    const oldest = makeAscent('a1', 'r1', 100)
    const result = deduplicateAscentsKeepLatest([newest, middle, oldest])
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('a3')
  })

  it('keeps one per route across multiple routes', () => {
    const ascents = [
      makeAscent('a1', 'r1', 100),
      makeAscent('a2', 'r1', 200), // later r1
      makeAscent('a3', 'r2', 50),
      makeAscent('a4', 'r2', 150), // later r2
      makeAscent('a5', 'r3', 75),
    ]
    const result = deduplicateAscentsKeepLatest(ascents)
    expect(result).toHaveLength(3)
    const ids = result.map((a) => a.id).sort()
    expect(ids).toContain('a2') // latest r1
    expect(ids).toContain('a4') // latest r2
    expect(ids).toContain('a5') // only r3
  })

  it('result is sorted by date descending', () => {
    const ascents = [
      makeAscent('a1', 'r1', 100),
      makeAscent('a2', 'r2', 300),
      makeAscent('a3', 'r3', 200),
    ]
    const result = deduplicateAscentsKeepLatest(ascents)
    expect(result[0]!.id).toBe('a2') // seconds=300
    expect(result[1]!.id).toBe('a3') // seconds=200
    expect(result[2]!.id).toBe('a1') // seconds=100
  })

  it('does not mutate the input array', () => {
    const ascents = [makeAscent('a1', 'r1', 100), makeAscent('a2', 'r1', 200)]
    const copy = [...ascents]
    deduplicateAscentsKeepLatest(ascents)
    expect(ascents).toEqual(copy)
  })

  it('handles ascents with missing date (defaults to 0)', () => {
    const withDate = makeAscent('a1', 'r1', 100)
    const withoutDate = { id: 'a2', routeId: 'r1', date: undefined as unknown as { seconds: number; nanoseconds: number } }
    const result = deduplicateAscentsKeepLatest([withDate, withoutDate])
    // a1 has seconds=100, a2 has undefined → 0; a1 wins
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('a1')
  })
})

// ---------------------------------------------------------------------------
// sortAscentsByDateDesc
// ---------------------------------------------------------------------------

describe('sortAscentsByDateDesc', () => {
  it('returns empty array for empty input', () => {
    expect(sortAscentsByDateDesc([])).toEqual([])
  })

  it('returns single element unchanged', () => {
    const a = makeAscent('a1', 'r1', 100)
    expect(sortAscentsByDateDesc([a])).toEqual([a])
  })

  it('sorts by date descending (most recent first)', () => {
    const ascents = [
      makeAscent('a1', 'r1', 100),
      makeAscent('a2', 'r2', 300),
      makeAscent('a3', 'r3', 200),
    ]
    const result = sortAscentsByDateDesc(ascents)
    expect(result.map((a) => a.id)).toEqual(['a2', 'a3', 'a1'])
  })

  it('already sorted input remains in order', () => {
    const ascents = [
      makeAscent('a1', 'r1', 300),
      makeAscent('a2', 'r2', 200),
      makeAscent('a3', 'r3', 100),
    ]
    const result = sortAscentsByDateDesc(ascents)
    expect(result.map((a) => a.id)).toEqual(['a1', 'a2', 'a3'])
  })

  it('does not mutate the original array', () => {
    const ascents = [
      makeAscent('a1', 'r1', 100),
      makeAscent('a2', 'r2', 300),
    ]
    const original = [...ascents]
    sortAscentsByDateDesc(ascents)
    expect(ascents).toEqual(original)
  })

  it('handles ties (same timestamp) without crashing', () => {
    const ascents = [
      makeAscent('a1', 'r1', 100),
      makeAscent('a2', 'r2', 100),
    ]
    expect(() => sortAscentsByDateDesc(ascents)).not.toThrow()
    expect(sortAscentsByDateDesc(ascents)).toHaveLength(2)
  })

  it('handles missing date (treated as 0)', () => {
    const withDate = makeAscent('a1', 'r1', 100)
    const noDate = { id: 'a2', routeId: 'r2', date: undefined as unknown as { seconds: number; nanoseconds: number } }
    const result = sortAscentsByDateDesc([noDate, withDate])
    // withDate (100) > noDate (0) → withDate first
    expect(result[0]!.id).toBe('a1')
    expect(result[1]!.id).toBe('a2')
  })
})
