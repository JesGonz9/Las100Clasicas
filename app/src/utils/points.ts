import type { Route } from '@/models'

const GRADE_POINTS: Record<string, number> = {
  'III': 5,
  'IV': 10,
  'IV+': 15,
  'V': 20,
  'V+': 25,
  '6a': 30,
  '6a+': 35,
  '6b': 40,
  '6b+': 45,
  '6c': 50,
  '6c+': 55,
  '7a': 65,
  '7a+': 75,
  '7b': 85,
  '7b+': 95,
  '7c': 110,
  '7c+': 125,
  '8a': 145,
}

export function getGradePoints(grade: string): number {
  if (!grade || !grade.trim()) return 0
  const normalized = grade.trim().toLowerCase()
  for (const [key, value] of Object.entries(GRADE_POINTS)) {
    if (key.toLowerCase() === normalized) return value
  }
  return 10
}

export function calculateAscentPoints(route: Route): number {
  const gradePoints = getGradePoints(route.difficulty.free)
  const lengthBonus = Math.floor((route.length ?? 0) * 0.1)
  return gradePoints + lengthBonus
}
