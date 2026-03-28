import { Timestamp } from 'firebase/firestore'

export interface User {
  id: string
  username: string
  email: string
  photoURL: string
  bio: string
  createdAt: Timestamp
}

export interface Route {
  id: string
  name: string
  zoneId: string
  wallId: string
  description: string
  difficulty: {
    free: string
    mandatory: string
    aid: string
  }
  length: number
  images: string[]
  externalLinks: string[]
  createdAt: Timestamp
}

export interface Zone {
  id: string
  name: string
}

export interface Wall {
  id: string
  name: string
  zoneId: string
  coordinates: {
    lat: number
    lng: number
  }
}

export interface Ascent {
  id: string
  userId: string
  routeId: string
  date: Timestamp
  rating: number
  comment: string
  partners: string[]
  photos: string[]
  createdAt: Timestamp
}

export interface Comment {
  id: string
  userId: string
  routeId: string
  content: string
  createdAt: Timestamp
}

export interface Follow {
  id: string
  followerId: string
  followingId: string
}

export interface Notification {
  id: string
  userId: string
  type: 'ascent' | 'comment' | 'follow' | 'achievement'
  message: string
  read: boolean
  createdAt: Timestamp
}

export interface Achievement {
  id: string
  name: string
  description: string
  condition: string
}

export interface UserAchievement {
  id: string
  userId: string
  achievementId: string
  unlockedAt: Timestamp
}
