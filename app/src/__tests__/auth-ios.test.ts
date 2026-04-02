/**
 * Tests for iOS-specific Firebase auth behaviour.
 *
 * Strategy:
 *  - Mock 'firebase/auth' to spy on signInWithPopup / signInWithRedirect / getRedirectResult
 *  - Mock '@/services/firebase/config' to avoid real Firebase init
 *  - Manipulate navigator.userAgent to simulate iOS vs non-iOS environments
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Firebase auth mock ──────────────────────────────────────────────────────
const mockSignInWithPopup = vi.fn()
const mockSignInWithRedirect = vi.fn()
const mockGetRedirectResult = vi.fn()
const mockGetDoc = vi.fn()
const mockSetDoc = vi.fn()
const mockDoc = vi.fn((_db: unknown, _col: string, id: string) => ({ id }))

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: class GoogleAuthProvider {},
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
  signInWithRedirect: (...args: unknown[]) => mockSignInWithRedirect(...args),
  getRedirectResult: (...args: unknown[]) => mockGetRedirectResult(...args),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  Timestamp: { now: () => ({ seconds: 0, nanoseconds: 0 }) },
}))

vi.mock('../services/firebase/config', () => ({
  auth: {},
  db: {},
  storage: {},
}))

// ── helpers ─────────────────────────────────────────────────────────────────

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    configurable: true,
  })
}

const IOS_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 ' +
  '(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// ── tests ────────────────────────────────────────────────────────────────────

describe('signInWithGoogle – iOS detection', () => {
  const originalUA = navigator.userAgent

  beforeEach(() => {
    vi.resetModules()
    mockSignInWithPopup.mockReset()
    mockSignInWithRedirect.mockReset()
    mockGetDoc.mockReset()
    mockSetDoc.mockReset()
  })

  afterEach(() => {
    setUserAgent(originalUA)
  })

  it('calls signInWithRedirect on iPhone', async () => {
    setUserAgent(IOS_UA)
    mockSignInWithRedirect.mockResolvedValue(undefined)

    const { signInWithGoogle } = await import('../services/firebase/auth')
    const result = await signInWithGoogle()

    expect(mockSignInWithRedirect).toHaveBeenCalledTimes(1)
    expect(mockSignInWithPopup).not.toHaveBeenCalled()
    // Returns null to signal redirect flow
    expect(result).toBeNull()
  })

  it('calls signInWithPopup on Android', async () => {
    setUserAgent(ANDROID_UA)
    const fakeUser = { uid: 'u1', email: 'a@b.com', displayName: 'Ana', photoURL: null }
    mockSignInWithPopup.mockResolvedValue({ user: fakeUser })
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({}), id: 'u1' })

    const { signInWithGoogle } = await import('../services/firebase/auth')
    const result = await signInWithGoogle()

    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1)
    expect(mockSignInWithRedirect).not.toHaveBeenCalled()
    expect(result).toBeTruthy()
  })

  it('calls signInWithPopup on desktop', async () => {
    setUserAgent(DESKTOP_UA)
    const fakeUser = { uid: 'u2', email: 'b@c.com', displayName: 'Bob', photoURL: '' }
    mockSignInWithPopup.mockResolvedValue({ user: fakeUser })
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({}), id: 'u2' })

    const { signInWithGoogle } = await import('../services/firebase/auth')
    const result = await signInWithGoogle()

    expect(mockSignInWithPopup).toHaveBeenCalledTimes(1)
    expect(mockSignInWithRedirect).not.toHaveBeenCalled()
    expect(result).toBeTruthy()
  })
})

describe('signInWithGoogle – iOS iPad detection', () => {
  const originalUA = navigator.userAgent

  beforeEach(() => {
    mockSignInWithRedirect.mockReset()
    mockSignInWithPopup.mockReset()
  })

  afterEach(() => {
    setUserAgent(originalUA)
  })

  it('calls signInWithRedirect on iPad', async () => {
    setUserAgent(
      'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 ' +
        '(KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    )
    mockSignInWithRedirect.mockResolvedValue(undefined)

    const { signInWithGoogle } = await import('../services/firebase/auth')
    await signInWithGoogle()

    expect(mockSignInWithRedirect).toHaveBeenCalledTimes(1)
    expect(mockSignInWithPopup).not.toHaveBeenCalled()
  })

  it('calls signInWithRedirect on iPod', async () => {
    setUserAgent('Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)')
    mockSignInWithRedirect.mockResolvedValue(undefined)

    const { signInWithGoogle } = await import('../services/firebase/auth')
    await signInWithGoogle()

    expect(mockSignInWithRedirect).toHaveBeenCalledTimes(1)
  })
})

describe('getGoogleRedirectResult', () => {
  beforeEach(() => {
    mockGetRedirectResult.mockReset()
    mockGetDoc.mockReset()
    mockSetDoc.mockReset()
  })

  it('returns null when there is no pending redirect', async () => {
    mockGetRedirectResult.mockResolvedValue(null)

    const { getGoogleRedirectResult } = await import('../services/firebase/auth')
    const result = await getGoogleRedirectResult()

    expect(result).toBeNull()
    expect(mockSetDoc).not.toHaveBeenCalled()
  })

  it('ensures user profile when redirect result has a new user', async () => {
    const fakeUser = { uid: 'u3', email: 'c@d.com', displayName: 'Carol', photoURL: '' }
    mockGetRedirectResult.mockResolvedValue({ user: fakeUser })
    // Simulate user not yet in Firestore
    mockGetDoc.mockResolvedValue({ exists: () => false })

    const { getGoogleRedirectResult } = await import('../services/firebase/auth')
    await getGoogleRedirectResult()

    expect(mockSetDoc).toHaveBeenCalledTimes(1)
  })

  it('skips setDoc when user profile already exists', async () => {
    const fakeUser = { uid: 'u4', email: 'd@e.com', displayName: 'Dave', photoURL: '' }
    mockGetRedirectResult.mockResolvedValue({ user: fakeUser })
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({}), id: 'u4' })

    const { getGoogleRedirectResult } = await import('../services/firebase/auth')
    await getGoogleRedirectResult()

    expect(mockSetDoc).not.toHaveBeenCalled()
  })
})
