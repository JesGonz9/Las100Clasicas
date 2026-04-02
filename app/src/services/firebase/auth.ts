import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type User as FirebaseUser,
} from 'firebase/auth'
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import { auth, db } from './config'
import type { User } from '@/models'

export async function signUp(email: string, password: string, username: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  const user: User = {
    id: credential.user.uid,
    username,
    email,
    photoURL: '',
    bio: '',
    createdAt: Timestamp.now(),
  }
  await setDoc(doc(db, 'users', user.id), user)
  return user
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password)
}

const googleProvider = new GoogleAuthProvider()

function isIOS() {
  return /iP(hone|od|ad)/.test(navigator.userAgent)
}

async function ensureGoogleProfile(firebaseUser: FirebaseUser) {
  const { uid, email, displayName, photoURL } = firebaseUser
  const existing = await getUserProfile(uid)
  if (!existing) {
    const user: User = {
      id: uid,
      username: displayName ?? email?.split('@')[0] ?? 'usuario',
      email: email ?? '',
      photoURL: photoURL ?? '',
      bio: '',
      createdAt: Timestamp.now(),
    }
    await setDoc(doc(db, 'users', uid), user)
  }
}

export async function signInWithGoogle() {
  if (isIOS()) {
    // On iOS Safari, popups are often blocked; use redirect flow instead
    await signInWithRedirect(auth, googleProvider)
    return null
  }
  const credential = await signInWithPopup(auth, googleProvider)
  await ensureGoogleProfile(credential.user)
  return credential
}

export async function getGoogleRedirectResult() {
  const credential = await getRedirectResult(auth)
  if (credential?.user) {
    await ensureGoogleProfile(credential.user)
  }
  return credential
}

export async function signOut() {
  return firebaseSignOut(auth)
}

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null
}

export async function ensureUserProfile(uid: string, email: string): Promise<User> {
  const user: User = {
    id: uid,
    username: email.split('@')[0] ?? 'usuario',
    email,
    photoURL: '',
    bio: '',
    createdAt: Timestamp.now(),
  }
  await setDoc(doc(db, 'users', uid), user)
  return user
}
