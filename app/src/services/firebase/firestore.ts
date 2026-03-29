import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from './config'
import type { Route, Zone, Wall, Ascent, Comment, Follow, Notification, Achievement, UserAchievement, User } from '@/models'

// ---- Users ----
export async function searchUsers(searchTerm: string): Promise<User[]> {
  const snap = await getDocs(collection(db, 'users'))
  const term = searchTerm.toLowerCase()
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as User)
    .filter((u) => u.username.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
}

export async function updateUserProfile(id: string, data: Partial<User>) {
  return updateDoc(doc(db, 'users', id), data)
}

// ---- Routes ----
export async function getRoutes(filters?: { zoneId?: string; difficulty?: string }) {
  let q = query(collection(db, 'routes'), orderBy('name'))
  if (filters?.zoneId) q = query(q, where('zoneId', '==', filters.zoneId))
  const snap = await getDocs(q)
  return {
    routes: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Route),
  }
}

export async function getRoute(id: string): Promise<Route | null> {
  const snap = await getDoc(doc(db, 'routes', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Route) : null
}

export async function createRoute(data: Omit<Route, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'routes'), { ...data, createdAt: Timestamp.now() })
}

export async function updateRoute(id: string, data: Partial<Route>) {
  return updateDoc(doc(db, 'routes', id), data)
}

export async function deleteRoute(id: string) {
  return deleteDoc(doc(db, 'routes', id))
}

// ---- Zones ----
export async function getZones(): Promise<Zone[]> {
  const snap = await getDocs(collection(db, 'zones'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Zone)
}

export async function createZone(name: string) {
  return addDoc(collection(db, 'zones'), { name })
}

export async function deleteZone(id: string) {
  return deleteDoc(doc(db, 'zones', id))
}

export async function updateZone(id: string, data: Partial<Zone>) {
  return updateDoc(doc(db, 'zones', id), data)
}

// ---- Walls ----
export async function getWalls(): Promise<Wall[]> {
  const snap = await getDocs(collection(db, 'walls'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Wall)
}

export async function createWall(name: string, zoneId: string, coordinates?: { lat: number; lng: number }) {
  return addDoc(collection(db, 'walls'), { name, zoneId, coordinates: coordinates ?? { lat: 0, lng: 0 } })
}

export async function deleteWall(id: string) {
  return deleteDoc(doc(db, 'walls', id))
}

export async function updateWall(id: string, data: Partial<Wall>) {
  return updateDoc(doc(db, 'walls', id), data)
}

// ---- Ascents ----
export async function getAscents(routeId?: string, userId?: string) {
  const constraints = []
  if (routeId) constraints.push(where('routeId', '==', routeId))
  if (userId) constraints.push(where('userId', '==', userId))
  const q = query(collection(db, 'ascents'), ...constraints)
  const snap = await getDocs(q)
  const ascents = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Ascent)
    .sort((a, b) => (b.date?.seconds ?? 0) - (a.date?.seconds ?? 0))
  return { ascents }
}

export async function createAscent(data: Omit<Ascent, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'ascents'), { ...data, createdAt: Timestamp.now() })
}

export async function updateAscent(id: string, data: Partial<Ascent>) {
  return updateDoc(doc(db, 'ascents', id), data)
}

export async function deleteAscent(id: string) {
  return deleteDoc(doc(db, 'ascents', id))
}

// ---- Comments ----
export async function getComments(routeId: string) {
  const q = query(collection(db, 'comments'), where('routeId', '==', routeId))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Comment)
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

export async function addComment(data: Omit<Comment, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'comments'), { ...data, createdAt: Timestamp.now() })
}

export async function deleteComment(id: string) {
  return deleteDoc(doc(db, 'comments', id))
}

// ---- Follows ----
export async function followUser(followerId: string, followingId: string) {
  return addDoc(collection(db, 'follows'), { followerId, followingId })
}

export async function unfollowUser(followerId: string, followingId: string) {
  const q = query(
    collection(db, 'follows'),
    where('followerId', '==', followerId),
    where('followingId', '==', followingId),
  )
  const snap = await getDocs(q)
  for (const d of snap.docs) {
    await deleteDoc(doc(db, 'follows', d.id))
  }
}

export async function getFollowers(userId: string) {
  const q = query(collection(db, 'follows'), where('followingId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Follow)
}

export async function getFollowing(userId: string) {
  const q = query(collection(db, 'follows'), where('followerId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Follow)
}

export async function isFollowing(followerId: string, followingId: string) {
  const q = query(
    collection(db, 'follows'),
    where('followerId', '==', followerId),
    where('followingId', '==', followingId),
  )
  const snap = await getDocs(q)
  return !snap.empty
}

// ---- Notifications ----
export async function getNotifications(userId: string) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Notification)
    .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

export async function markNotificationRead(id: string) {
  return updateDoc(doc(db, 'notifications', id), { read: true })
}

export async function createNotification(data: Omit<Notification, 'id' | 'createdAt'>) {
  return addDoc(collection(db, 'notifications'), { ...data, createdAt: Timestamp.now() })
}

// ---- Achievements ----
export async function getAchievements(): Promise<Achievement[]> {
  const snap = await getDocs(collection(db, 'achievements'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Achievement)
}

export async function createAchievement(data: Omit<Achievement, 'id'>) {
  return addDoc(collection(db, 'achievements'), data)
}

export async function deleteAchievement(id: string) {
  return deleteDoc(doc(db, 'achievements', id))
}

export async function updateAchievement(id: string, data: Partial<Achievement>) {
  return updateDoc(doc(db, 'achievements', id), data)
}

export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const q = query(collection(db, 'userAchievements'), where('userId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UserAchievement)
}

export async function unlockAchievement(userId: string, achievementId: string) {
  return addDoc(collection(db, 'userAchievements'), {
    userId,
    achievementId,
    unlockedAt: Timestamp.now(),
  })
}

export async function checkAchievements(userId: string): Promise<Achievement[]> {
  const [allAchievements, userAchievements, ascentsData, routes, zones] = await Promise.all([
    getAchievements(),
    getUserAchievements(userId),
    getAscents(undefined, userId),
    getRoutes(),
    getZones(),
  ])

  const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId))
  const userAscents = ascentsData.ascents
  const ascendedRouteIds = new Set(userAscents.map((a) => a.routeId))
  const ascendedZoneIds = new Set(
    userAscents
      .map((a) => routes.routes.find((r) => r.id === a.routeId)?.zoneId)
      .filter(Boolean) as string[],
  )

  const newlyUnlocked: Achievement[] = []

  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.id)) continue

    let completed = false

    switch (achievement.type) {
      case 'ascent_count':
        completed = ascendedRouteIds.size >= (achievement.threshold ?? 0)
        break
      case 'zone_count':
        completed = ascendedZoneIds.size >= (achievement.threshold ?? 0)
        break
      case 'route_specific':
        completed = (achievement.routeIds ?? []).every((rid) => ascendedRouteIds.has(rid))
        break
      case 'all_routes':
        completed = routes.routes.length > 0 && routes.routes.every((r) => ascendedRouteIds.has(r.id))
        break
    }

    if (completed) {
      await unlockAchievement(userId, achievement.id)
      newlyUnlocked.push(achievement)
    }
  }

  return newlyUnlocked
}

export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as User)
}
