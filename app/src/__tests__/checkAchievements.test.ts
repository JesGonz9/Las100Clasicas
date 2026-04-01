/**
 * Integration tests for checkAchievements and syncAllUsersAchievements.
 * Firebase/Firestore is mocked — no real network calls are made.
 *
 * getDocs call order inside checkAchievements (via Promise.all):
 *   1st → getAchievements()       → 'achievements' collection
 *   2nd → getUserAchievements()   → 'userAchievements' collection
 *   3rd → getAscents()            → 'ascents' collection
 *   4th → getRoutes()             → 'routes' collection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Firebase mocks (must be before any imports that use firebase) -------
vi.mock('@/services/firebase/config', () => ({ db: 'mock-db' }))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => 'mock-firestore'),
  collection: vi.fn((_db: unknown, name: string) => ({ _name: name })),
  doc: vi.fn((_db: unknown, col: string, id: string) => `${col}/${id}`),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-doc-id' }),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  query: vi.fn((ref: unknown) => ref),
  where: vi.fn(),
  orderBy: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: 1000, nanoseconds: 0 })),
    fromDate: vi.fn((d: Date) => ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 })),
  },
}))

// ---- Import after mocks are set up ----------------------------------------
import { getDocs, addDoc, deleteDoc } from 'firebase/firestore'
import { checkAchievements, syncAllUsersAchievements } from '../services/firebase/firestore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type DocRow = Record<string, unknown> & { id: string }

function makeDocs(rows: DocRow[]) {
  return {
    docs: rows.map((row) => ({
      id: row.id,
      data: () => {
        const { id: _id, ...rest } = row
        return rest
      },
    })),
  }
}

const mockedGetDocs = getDocs as ReturnType<typeof vi.fn>
const mockedAddDoc = addDoc as ReturnType<typeof vi.fn>
const mockedDeleteDoc = deleteDoc as ReturnType<typeof vi.fn>

// Convenience: set up the 4 getDocs responses in correct order
function setupGetDocs(
  achievements: DocRow[],
  userAchievements: DocRow[],
  ascents: DocRow[],
  routes: DocRow[],
) {
  mockedGetDocs
    .mockResolvedValueOnce(makeDocs(achievements))
    .mockResolvedValueOnce(makeDocs(userAchievements))
    .mockResolvedValueOnce(makeDocs(ascents))
    .mockResolvedValueOnce(makeDocs(routes))
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// checkAchievements — unlocking
// ---------------------------------------------------------------------------

describe('checkAchievements: unlocking', () => {
  it('unlocks an ascent_count achievement and returns it', async () => {
    setupGetDocs(
      [{ id: 'ach-1', type: 'ascent_count', threshold: 1, points: 10, name: 'First Step', description: 'You did it!', icon: '🏔️' }],
      [], // no existing userAchievements
      [{ id: 'asc-1', userId: 'u1', routeId: 'r1', date: { seconds: 100 } }],
      [{ id: 'r1', name: 'Route 1', zoneId: 'z1' }],
    )

    const result = await checkAchievements('u1')

    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('ach-1')
    expect(mockedAddDoc).toHaveBeenCalledOnce()
  })

  it('unlocks a zone_count achievement when enough zones visited', async () => {
    setupGetDocs(
      [{ id: 'ach-z', type: 'zone_count', threshold: 2, points: 20, name: 'Explorer', description: '', icon: '🗺️' }],
      [],
      [
        { id: 'a1', userId: 'u1', routeId: 'r1', date: { seconds: 100 } },
        { id: 'a2', userId: 'u1', routeId: 'r3', date: { seconds: 200 } },
      ],
      [
        { id: 'r1', name: 'R1', zoneId: 'z1' },
        { id: 'r3', name: 'R3', zoneId: 'z2' },
      ],
    )

    const result = await checkAchievements('u1')

    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('ach-z')
  })

  it('unlocks a route_specific achievement when all required routes ascended', async () => {
    setupGetDocs(
      [{ id: 'ach-s', type: 'route_specific', routeIds: ['r1', 'r2'], points: 50, name: 'Duo', description: '', icon: '🤝' }],
      [],
      [
        { id: 'a1', userId: 'u1', routeId: 'r1', date: { seconds: 100 } },
        { id: 'a2', userId: 'u1', routeId: 'r2', date: { seconds: 200 } },
      ],
      [{ id: 'r1', name: 'R1', zoneId: 'z1' }, { id: 'r2', name: 'R2', zoneId: 'z1' }],
    )

    const result = await checkAchievements('u1')

    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('ach-s')
  })

  it('unlocks an all_routes achievement when every route is ascended', async () => {
    setupGetDocs(
      [{ id: 'ach-all', type: 'all_routes', points: 500, name: 'Legend', description: '', icon: '🏆' }],
      [],
      [
        { id: 'a1', userId: 'u1', routeId: 'r1', date: { seconds: 100 } },
        { id: 'a2', userId: 'u1', routeId: 'r2', date: { seconds: 200 } },
      ],
      [{ id: 'r1', name: 'R1', zoneId: 'z1' }, { id: 'r2', name: 'R2', zoneId: 'z1' }],
    )

    const result = await checkAchievements('u1')

    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('ach-all')
  })

  it('unlocks multiple achievements at once', async () => {
    setupGetDocs(
      [
        { id: 'ach-1', type: 'ascent_count', threshold: 1, points: 10, name: 'A', description: '', icon: '' },
        { id: 'ach-2', type: 'ascent_count', threshold: 2, points: 20, name: 'B', description: '', icon: '' },
      ],
      [],
      [
        { id: 'a1', userId: 'u1', routeId: 'r1', date: { seconds: 100 } },
        { id: 'a2', userId: 'u1', routeId: 'r2', date: { seconds: 200 } },
      ],
      [{ id: 'r1', name: 'R1', zoneId: 'z1' }, { id: 'r2', name: 'R2', zoneId: 'z1' }],
    )

    const result = await checkAchievements('u1')

    expect(result).toHaveLength(2)
    expect(mockedAddDoc).toHaveBeenCalledTimes(2)
  })

  it('does not return achievements that are not yet completed', async () => {
    setupGetDocs(
      [{ id: 'ach-1', type: 'ascent_count', threshold: 5, points: 50, name: 'A', description: '', icon: '' }],
      [],
      [{ id: 'a1', userId: 'u1', routeId: 'r1', date: { seconds: 100 } }],
      [{ id: 'r1', name: 'R1', zoneId: 'z1' }],
    )

    const result = await checkAchievements('u1')

    expect(result).toHaveLength(0)
    expect(mockedAddDoc).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// checkAchievements — already unlocked (idempotency)
// ---------------------------------------------------------------------------

describe('checkAchievements: already unlocked', () => {
  it('does not re-unlock an already-unlocked achievement', async () => {
    setupGetDocs(
      [{ id: 'ach-1', type: 'ascent_count', threshold: 1, points: 10, name: 'A', description: '', icon: '' }],
      [{ id: 'ua-1', userId: 'u1', achievementId: 'ach-1', unlockedAt: { seconds: 50 } }], // already unlocked
      [{ id: 'a1', userId: 'u1', routeId: 'r1', date: { seconds: 100 } }],
      [{ id: 'r1', name: 'R1', zoneId: 'z1' }],
    )

    const result = await checkAchievements('u1')

    expect(result).toHaveLength(0) // nothing newly unlocked
    expect(mockedAddDoc).not.toHaveBeenCalled()
    expect(mockedDeleteDoc).not.toHaveBeenCalled()
  })

  it('returns empty array when no achievements exist', async () => {
    setupGetDocs([], [], [], [])

    const result = await checkAchievements('u1')

    expect(result).toHaveLength(0)
    expect(mockedAddDoc).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// checkAchievements — revocation
// ---------------------------------------------------------------------------

describe('checkAchievements: revocation', () => {
  it('revokes an achievement when conditions are no longer met', async () => {
    setupGetDocs(
      [{ id: 'ach-1', type: 'ascent_count', threshold: 3, points: 30, name: 'A', description: '', icon: '' }],
      [{ id: 'ua-1', userId: 'u1', achievementId: 'ach-1', unlockedAt: { seconds: 50 } }],
      // Only 1 ascent — no longer meets threshold of 3
      [{ id: 'a1', userId: 'u1', routeId: 'r1', date: { seconds: 100 } }],
      [{ id: 'r1', name: 'R1', zoneId: 'z1' }],
    )

    await checkAchievements('u1')

    expect(mockedDeleteDoc).toHaveBeenCalledOnce()
    expect(mockedDeleteDoc).toHaveBeenCalledWith('userAchievements/ua-1')
  })

  it('revokes when all ascents are deleted (no ascents left)', async () => {
    setupGetDocs(
      [{ id: 'ach-1', type: 'ascent_count', threshold: 1, points: 10, name: 'A', description: '', icon: '' }],
      [{ id: 'ua-1', userId: 'u1', achievementId: 'ach-1', unlockedAt: { seconds: 50 } }],
      [], // no ascents
      [{ id: 'r1', name: 'R1', zoneId: 'z1' }],
    )

    await checkAchievements('u1')

    expect(mockedDeleteDoc).toHaveBeenCalledWith('userAchievements/ua-1')
    expect(mockedAddDoc).not.toHaveBeenCalled()
  })

  it('revokes a route_specific achievement when a required route ascent is removed', async () => {
    setupGetDocs(
      [{ id: 'ach-s', type: 'route_specific', routeIds: ['r1', 'r2'], points: 50, name: 'Duo', description: '', icon: '' }],
      [{ id: 'ua-s', userId: 'u1', achievementId: 'ach-s', unlockedAt: { seconds: 50 } }],
      [{ id: 'a1', userId: 'u1', routeId: 'r1', date: { seconds: 100 } }], // r2 missing
      [{ id: 'r1', name: 'R1', zoneId: 'z1' }, { id: 'r2', name: 'R2', zoneId: 'z1' }],
    )

    await checkAchievements('u1')

    expect(mockedDeleteDoc).toHaveBeenCalledWith('userAchievements/ua-s')
  })

  it('revokes an all_routes achievement when a new route is added', async () => {
    setupGetDocs(
      [{ id: 'ach-all', type: 'all_routes', points: 500, name: 'Legend', description: '', icon: '' }],
      [{ id: 'ua-all', userId: 'u1', achievementId: 'ach-all', unlockedAt: { seconds: 50 } }],
      [{ id: 'a1', userId: 'u1', routeId: 'r1', date: { seconds: 100 } }],
      // Now 2 routes in system but only r1 ascended
      [{ id: 'r1', name: 'R1', zoneId: 'z1' }, { id: 'r2', name: 'R2', zoneId: 'z1' }],
    )

    await checkAchievements('u1')

    expect(mockedDeleteDoc).toHaveBeenCalledWith('userAchievements/ua-all')
  })
})

// ---------------------------------------------------------------------------
// checkAchievements — orphan cleanup
// ---------------------------------------------------------------------------

describe('checkAchievements: orphan cleanup', () => {
  it('deletes a userAchievement whose achievement was deleted', async () => {
    setupGetDocs(
      [], // no achievements in system anymore
      [{ id: 'ua-gone', userId: 'u1', achievementId: 'deleted-ach', unlockedAt: { seconds: 50 } }],
      [],
      [],
    )

    await checkAchievements('u1')

    expect(mockedDeleteDoc).toHaveBeenCalledWith('userAchievements/ua-gone')
  })

  it('deletes multiple orphaned userAchievements', async () => {
    setupGetDocs(
      [],
      [
        { id: 'ua-1', userId: 'u1', achievementId: 'deleted-1', unlockedAt: { seconds: 50 } },
        { id: 'ua-2', userId: 'u1', achievementId: 'deleted-2', unlockedAt: { seconds: 60 } },
      ],
      [],
      [],
    )

    await checkAchievements('u1')

    expect(mockedDeleteDoc).toHaveBeenCalledTimes(2)
  })
})

// ---------------------------------------------------------------------------
// syncAllUsersAchievements
// ---------------------------------------------------------------------------

describe('syncAllUsersAchievements', () => {
  it('calls checkAchievements for each user in the system', async () => {
    // 1st getDocs call in syncAllUsersAchievements: getAllUsers → 'users' collection
    mockedGetDocs.mockResolvedValueOnce(makeDocs([
      { id: 'u1', username: 'Alice', email: 'a@a.com', bio: '', photoURL: '' },
      { id: 'u2', username: 'Bob', email: 'b@b.com', bio: '', photoURL: '' },
    ]))
    // checkAchievements for u1: 4 getDocs calls
    mockedGetDocs
      .mockResolvedValueOnce(makeDocs([]))  // achievements u1
      .mockResolvedValueOnce(makeDocs([]))  // userAchievements u1
      .mockResolvedValueOnce(makeDocs([]))  // ascents u1
      .mockResolvedValueOnce(makeDocs([]))  // routes u1
    // checkAchievements for u2: 4 getDocs calls
    mockedGetDocs
      .mockResolvedValueOnce(makeDocs([]))  // achievements u2
      .mockResolvedValueOnce(makeDocs([]))  // userAchievements u2
      .mockResolvedValueOnce(makeDocs([]))  // ascents u2
      .mockResolvedValueOnce(makeDocs([]))  // routes u2

    await syncAllUsersAchievements()

    // getAllUsers (1) + 4×2 users = 9 total getDocs calls
    expect(mockedGetDocs).toHaveBeenCalledTimes(9)
  })

  it('does nothing when there are no users', async () => {
    mockedGetDocs.mockResolvedValueOnce(makeDocs([]))

    await syncAllUsersAchievements()

    expect(mockedGetDocs).toHaveBeenCalledTimes(1)
    expect(mockedAddDoc).not.toHaveBeenCalled()
  })
})
