import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { cacheGet, cacheSet, cacheInvalidate, CACHE_KEYS } from '../services/firebase/staticCache'

// Reset module state between tests by re-importing with a fresh store.
// Because the store is module-level, we clear it via cacheInvalidate before each test.
beforeEach(() => {
  // Wipe every key we might have touched
  cacheInvalidate(
    CACHE_KEYS.zones,
    CACHE_KEYS.walls,
    CACHE_KEYS.achievements,
    CACHE_KEYS.routes(),
    CACHE_KEYS.routes('z1'),
    CACHE_KEYS.routes('z2'),
    'custom-key',
  )
  vi.useRealTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// CACHE_KEYS
// ---------------------------------------------------------------------------

describe('CACHE_KEYS', () => {
  it('zones is the string "zones"', () => {
    expect(CACHE_KEYS.zones).toBe('zones')
  })

  it('walls is the string "walls"', () => {
    expect(CACHE_KEYS.walls).toBe('walls')
  })

  it('achievements is the string "achievements"', () => {
    expect(CACHE_KEYS.achievements).toBe('achievements')
  })

  it('routes() with no argument returns "routes"', () => {
    expect(CACHE_KEYS.routes()).toBe('routes')
  })

  it('routes(zoneId) returns "routes:zone=<zoneId>"', () => {
    expect(CACHE_KEYS.routes('z1')).toBe('routes:zone=z1')
  })

  it('routes with different zoneIds produce different keys', () => {
    expect(CACHE_KEYS.routes('z1')).not.toBe(CACHE_KEYS.routes('z2'))
  })

  it('routes(undefined) produces the same key as routes()', () => {
    expect(CACHE_KEYS.routes(undefined)).toBe(CACHE_KEYS.routes())
  })
})

// ---------------------------------------------------------------------------
// cacheGet — miss cases
// ---------------------------------------------------------------------------

describe('cacheGet — miss', () => {
  it('returns null for a key that was never set', () => {
    expect(cacheGet('never-set')).toBeNull()
  })

  it('returns null after the entry has been invalidated', () => {
    cacheSet('custom-key', { value: 42 })
    cacheInvalidate('custom-key')
    expect(cacheGet('custom-key')).toBeNull()
  })

  it('returns null after TTL has expired', () => {
    vi.useFakeTimers()
    cacheSet('custom-key', 'hello')
    // advance past the 10-minute TTL
    vi.advanceTimersByTime(10 * 60 * 1000 + 1)
    expect(cacheGet('custom-key')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// cacheGet — hit cases
// ---------------------------------------------------------------------------

describe('cacheGet — hit', () => {
  it('returns stored primitive value', () => {
    cacheSet('custom-key', 'world')
    expect(cacheGet<string>('custom-key')).toBe('world')
  })

  it('returns stored array by reference', () => {
    const data = [{ id: 'r1' }, { id: 'r2' }]
    cacheSet('custom-key', data)
    expect(cacheGet('custom-key')).toBe(data)
  })

  it('returns stored object by reference', () => {
    const obj = { foo: 'bar', count: 3 }
    cacheSet('custom-key', obj)
    expect(cacheGet('custom-key')).toBe(obj)
  })

  it('is still valid just before TTL expires', () => {
    vi.useFakeTimers()
    cacheSet('custom-key', 'alive')
    // advance to just before TTL
    vi.advanceTimersByTime(10 * 60 * 1000 - 1)
    expect(cacheGet<string>('custom-key')).toBe('alive')
  })
})

// ---------------------------------------------------------------------------
// cacheSet
// ---------------------------------------------------------------------------

describe('cacheSet', () => {
  it('overwrites an existing entry with new data', () => {
    cacheSet('custom-key', 'first')
    cacheSet('custom-key', 'second')
    expect(cacheGet<string>('custom-key')).toBe('second')
  })

  it('refreshes the TTL when overwriting', () => {
    vi.useFakeTimers()
    cacheSet('custom-key', 'v1')
    // advance 9 minutes — still valid
    vi.advanceTimersByTime(9 * 60 * 1000)
    // overwrite to reset TTL
    cacheSet('custom-key', 'v2')
    // advance another 9 minutes (18 total) — should still be valid because TTL was reset
    vi.advanceTimersByTime(9 * 60 * 1000)
    expect(cacheGet<string>('custom-key')).toBe('v2')
  })

  it('can store entries under multiple independent keys', () => {
    cacheSet(CACHE_KEYS.zones, ['z1'])
    cacheSet(CACHE_KEYS.walls, ['w1'])
    expect(cacheGet(CACHE_KEYS.zones)).toEqual(['z1'])
    expect(cacheGet(CACHE_KEYS.walls)).toEqual(['w1'])
  })

  it('can store null as a value', () => {
    cacheSet('custom-key', null)
    // null is stored but cacheGet special-cases null by returning null anyway
    // this tests that the store map entry exists but returns null (falsy)
    expect(cacheGet('custom-key')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// cacheInvalidate
// ---------------------------------------------------------------------------

describe('cacheInvalidate', () => {
  it('deletes a single key', () => {
    cacheSet(CACHE_KEYS.zones, ['z1'])
    cacheInvalidate(CACHE_KEYS.zones)
    expect(cacheGet(CACHE_KEYS.zones)).toBeNull()
  })

  it('deletes multiple keys at once', () => {
    cacheSet(CACHE_KEYS.zones, ['z1'])
    cacheSet(CACHE_KEYS.walls, ['w1'])
    cacheSet(CACHE_KEYS.achievements, ['a1'])
    cacheInvalidate(CACHE_KEYS.zones, CACHE_KEYS.walls, CACHE_KEYS.achievements)
    expect(cacheGet(CACHE_KEYS.zones)).toBeNull()
    expect(cacheGet(CACHE_KEYS.walls)).toBeNull()
    expect(cacheGet(CACHE_KEYS.achievements)).toBeNull()
  })

  it('only removes the specified key, not others', () => {
    cacheSet(CACHE_KEYS.zones, ['z1'])
    cacheSet(CACHE_KEYS.walls, ['w1'])
    cacheInvalidate(CACHE_KEYS.zones)
    expect(cacheGet(CACHE_KEYS.zones)).toBeNull()
    expect(cacheGet(CACHE_KEYS.walls)).toEqual(['w1'])
  })

  it('is a no-op for a key that was never set (does not throw)', () => {
    expect(() => cacheInvalidate('non-existent-key')).not.toThrow()
  })

  it('is a no-op for a key that has already been invalidated', () => {
    cacheSet('custom-key', 'data')
    cacheInvalidate('custom-key')
    expect(() => cacheInvalidate('custom-key')).not.toThrow()
  })

  it('route-specific zone key is independent from the base routes key', () => {
    cacheSet(CACHE_KEYS.routes(), ['all-routes'])
    cacheSet(CACHE_KEYS.routes('z1'), ['zone-z1-routes'])
    cacheInvalidate(CACHE_KEYS.routes('z1'))
    expect(cacheGet(CACHE_KEYS.routes())).toEqual(['all-routes'])
    expect(cacheGet(CACHE_KEYS.routes('z1'))).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// TTL expiry removes the entry from the store
// ---------------------------------------------------------------------------

describe('TTL expiry cleanup', () => {
  it('expired entry is removed from the store (next get returns null)', () => {
    vi.useFakeTimers()
    cacheSet('custom-key', 'to-expire')
    vi.advanceTimersByTime(10 * 60 * 1000 + 1)
    const result = cacheGet<string>('custom-key')
    expect(result).toBeNull()
    // A second call also returns null (not stuck)
    expect(cacheGet<string>('custom-key')).toBeNull()
  })

  it('setting a new value after expiry works correctly', () => {
    vi.useFakeTimers()
    cacheSet('custom-key', 'first')
    vi.advanceTimersByTime(10 * 60 * 1000 + 1)
    // expired — now set fresh
    cacheSet('custom-key', 'fresh')
    expect(cacheGet<string>('custom-key')).toBe('fresh')
  })
})
