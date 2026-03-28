import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
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

export async function signInWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider)
  const { uid, email, displayName, photoURL } = credential.user
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
