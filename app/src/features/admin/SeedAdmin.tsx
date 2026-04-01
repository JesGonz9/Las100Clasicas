/**
 * SeedAdmin — entorno de prueba completo para la sección Social.
 *
 * Usuarios (sin Firebase Auth, solo Firestore):
 *   PedroEscalado  — ~55 vías, multi-zona → desbloquea todos los logros de cuenta
 *   JavierAlpino   — exactamente 25 vías, multi-zona → umbral "25 Clásicas" exacto
 *   MaríaVertical  — exactamente 10 vías, multi-zona → umbral "10 Clásicas" exacto
 *   LauraDeAlturas — exactamente 9 vías, zona única → justo por debajo del umbral 10
 *   CarlosRoca     — 1 vía con ascensión duplicada → prueba deduplicación
 *   AnaPrimeros    — 0 vías → prueba estado vacío
 *
 * Logros creados con IDs fijos (idempotente).
 * Red de seguimientos: mutuos, unidireccionales y usuario aislado (Ana).
 * Notificaciones generadas por cada seguimiento.
 * Ascensiones con fechas, valoraciones y comentarios realistas.
 * Usa las funciones de servicio existentes: createAscent, followUser, createNotification.
 *
 * NO toca vías, paredes ni zonas.
 * Idempotente: comprueba si ya existe antes de crear nada.
 * "Limpiar" elimina exactamente los datos que creó.
 */

import { useState } from 'react'
import {
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import {
  checkAchievements,
  createAscent,
  followUser,
  createNotification,
} from '@/services/firebase/firestore'
import { getRoutes } from '@/services/firebase'
import { Spinner } from '@/components'
import { Play, Trash2 } from 'lucide-react'
import type { AchievementType, Route } from '@/models'

// ---------------------------------------------------------------------------
// Constantes de seed
// ---------------------------------------------------------------------------

export const SEED_USER_IDS = [
  'seed_pedro',
  'seed_javier',
  'seed_maria',
  'seed_laura',
  'seed_carlos',
  'seed_ana',
] as const

type SeedUserId = (typeof SEED_USER_IDS)[number]

const SEED_USERS: Array<{ id: SeedUserId; username: string; email: string; bio: string }> = [
  {
    id: 'seed_pedro',
    username: 'PedroEscalado',
    email: 'pedro@seed.test',
    bio: '20 años en la roca. Las clásicas son mi vida. Guía de montaña y eterno aspirante a las 100.',
  },
  {
    id: 'seed_javier',
    username: 'JavierAlpino',
    email: 'javier@seed.test',
    bio: 'Solo las vías de más de 300 metros merecen la pena. Alpinismo y escalada clásica.',
  },
  {
    id: 'seed_maria',
    username: 'MaríaVertical',
    email: 'maria@seed.test',
    bio: 'Escaladora y fotógrafa de montaña. Cada vía es una historia.',
  },
  {
    id: 'seed_laura',
    username: 'LauraDeAlturas',
    email: 'laura@seed.test',
    bio: 'Especialista en vías de gran recorrido del Pirineo. 9 clásicas y subiendo.',
  },
  {
    id: 'seed_carlos',
    username: 'CarlosRoca',
    email: 'carlos@seed.test',
    bio: 'Escalador de fin de semana con grandes aspiraciones y poca paciencia para el mal tiempo.',
  },
  {
    id: 'seed_ana',
    username: 'AnaPrimeros',
    email: 'ana@seed.test',
    bio: '¡Recién empiezo! Emocionada con cada vía, aprendiendo de los mejores.',
  },
]

// Logros con IDs fijos (idempotente via setDoc)
const SEED_ACHIEVEMENTS: Array<{
  id: string
  name: string
  description: string
  icon: string
  type: AchievementType
  threshold?: number
  points: number
}> = [
  {
    id: 'seed_ach_primeros_pasos',
    name: 'Primeros pasos',
    description: '¡Completa tu primera vía de las 100 clásicas!',
    icon: '🎯',
    type: 'ascent_count',
    threshold: 1,
    points: 10,
  },
  {
    id: 'seed_ach_10clasicas',
    name: '10 Clásicas',
    description: 'Has escalado 10 vías. ¡Eso es dedicación!',
    icon: '🏔️',
    type: 'ascent_count',
    threshold: 10,
    points: 50,
  },
  {
    id: 'seed_ach_25clasicas',
    name: '25 Clásicas',
    description: 'La cuarta parte del camino recorrida. ¡Sigue así!',
    icon: '⛰️',
    type: 'ascent_count',
    threshold: 25,
    points: 150,
  },
  {
    id: 'seed_ach_50clasicas',
    name: '50 Clásicas',
    description: 'Mitad del camino. Leyenda en ciernes.',
    icon: '🧗',
    type: 'ascent_count',
    threshold: 50,
    points: 400,
  },
  {
    id: 'seed_ach_explorador',
    name: 'Explorador',
    description: 'Has escalado en al menos 2 zonas distintas.',
    icon: '🗺️',
    type: 'zone_count',
    threshold: 2,
    points: 75,
  },
  {
    id: 'seed_ach_nomada',
    name: 'Nómada de las Cumbres',
    description: 'Has escalado en 3 o más zonas diferentes. ¡Auténtico nómada!',
    icon: '🌍',
    type: 'zone_count',
    threshold: 3,
    points: 200,
  },
]

/**
 * Red de seguimientos:
 *
 * Mutuos:       Pedro ↔ Javier, Pedro ↔ María, Javier ↔ María
 * Unidirec.:    Laura → Pedro (sin retorno), Laura → María (sin retorno)
 *               Carlos → Pedro (sin retorno), Carlos → Javier (sin retorno)
 * Aislada:      Ana no sigue a nadie y nadie la sigue
 *
 * Seguidores:  Pedro=4 (Javier,María,Laura,Carlos), Javier=3 (Pedro,María,Carlos),
 *              María=3 (Pedro,Javier,Laura), Laura=0, Carlos=0, Ana=0
 */
const SEED_FOLLOWS: Array<[SeedUserId, SeedUserId]> = [
  // Pedro ↔ Javier
  ['seed_pedro', 'seed_javier'],
  ['seed_javier', 'seed_pedro'],
  // Pedro ↔ María
  ['seed_pedro', 'seed_maria'],
  ['seed_maria', 'seed_pedro'],
  // Javier ↔ María
  ['seed_javier', 'seed_maria'],
  ['seed_maria', 'seed_javier'],
  // Laura → Pedro y María (unidireccional)
  ['seed_laura', 'seed_pedro'],
  ['seed_laura', 'seed_maria'],
  // Carlos → Pedro y Javier (fan, sin retorno)
  ['seed_carlos', 'seed_pedro'],
  ['seed_carlos', 'seed_javier'],
]

// ~60 % con contenido, ~40 % sin comentario, repartidos uniformemente
const ASCENT_COMMENTS = [
  'Vía impresionante, muy recomendable. La roca es de primera.',
  'La clásica por excelencia de esta zona. No puede faltar.',
  'Un poco polvoriento en los primeros largos, pero el resto perfecto.',
  'Expuesto pero asequible. El segundo largo es clave.',
  'Larga y variada, volvería sin dudarlo.',
  'La aproximación es larga pero merece la pena con creces.',
  'Protección justa pero suficiente. Hay que ir con cabeza.',
  'El panorama desde la cima es espectacular.',
  'Muy satisfactoria al llegar a la cumbre. Clásico total.',
  'Perfecta para un día completo en la montaña.',
  'Requiere algo de experiencia en terreno expuesto.',
  'La roca aquí es alucinante, de lo mejor que he escalado.',
  'Dificultad sostenida en los largos clave. Muy exigente.',
  'Ideal para progresar en vías largas. Muy completa.',
  'Un clásico olvidado que merece más tráfico.',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
]

// Companions pool (~60 % of ascents have partners)
const PARTNER_OPTIONS: Record<SeedUserId, string[][]> = {
  seed_pedro:  [[], ['JavierAlpino'], ['MaríaVertical'], ['JavierAlpino', 'MaríaVertical'], [], ['JavierAlpino']],
  seed_javier: [[], ['PedroEscalado'], ['MaríaVertical'], [], ['PedroEscalado'], []],
  seed_maria:  [[], ['PedroEscalado'], ['JavierAlpino'], ['LauraDeAlturas'], [], ['JavierAlpino']],
  seed_laura:  [[], ['MaríaVertical'], [], ['PedroEscalado'], [], []],
  seed_carlos: [[], ['PedroEscalado'], [], []],
  seed_ana:    [[], []],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic rating: 3 % → 1★, 7 % → 2★, 15 % → 3★, 35 % → 4★, 40 % → 5★ */
function deterministicRating(routeIndex: number, userIndex: number): number {
  const h = (routeIndex * 31 + userIndex * 17) % 100
  if (h < 3) return 1
  if (h < 10) return 2
  if (h < 25) return 3
  if (h < 60) return 4
  return 5
}

function getPartners(userId: SeedUserId, routeIndex: number): string[] {
  const opts = PARTNER_OPTIONS[userId]
  return opts[routeIndex % opts.length] ?? []
}

/**
 * Returns a Timestamp for ascent #routeIndex out of totalRoutes for the given user.
 * Last 5 ascents fall within the past 2 weeks (ensures fresh feed content).
 * Earlier ascents are spread over up to 14 months.
 */
function ascentTimestamp(routeIndex: number, totalRoutes: number, userIndex: number): Timestamp {
  const nowMs = Date.now()
  const FOURTEEN_MONTHS = 14 * 30 * 24 * 60 * 60 * 1000
  const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000
  const USER_OFFSET = userIndex * 3 * 24 * 60 * 60 * 1000 // 3-day stagger between users

  if (totalRoutes <= 5) {
    const f = totalRoutes > 1 ? routeIndex / (totalRoutes - 1) : 0
    return Timestamp.fromDate(new Date(nowMs - TWO_WEEKS + f * TWO_WEEKS))
  }

  const recentStart = totalRoutes - 5
  if (routeIndex >= recentStart) {
    const f = (routeIndex - recentStart) / 4
    return Timestamp.fromDate(new Date(nowMs - TWO_WEEKS + f * TWO_WEEKS))
  }

  const f = recentStart > 1 ? routeIndex / (recentStart - 1) : 0
  const span = FOURTEEN_MONTHS - TWO_WEEKS
  return Timestamp.fromDate(new Date(nowMs - FOURTEEN_MONTHS + USER_OFFSET + f * span))
}

/**
 * Builds a zone-interleaved array of routes.
 * Round-robins across zones so that the first N routes spread across all zones evenly.
 */
function buildInterleaved(routesByZone: Map<string, Route[]>): Route[] {
  const queues = [...routesByZone.values()].map((rs) => [...rs])
  const interleaved: Route[] = []
  let zi = 0
  for (;;) {
    let advanced = false
    for (let attempt = 0; attempt < queues.length; attempt++) {
      const q = queues[(zi + attempt) % queues.length]!
      if (q.length > 0) {
        interleaved.push(q.shift()!)
        zi = (zi + attempt + 1) % queues.length
        advanced = true
        break
      }
    }
    if (!advanced) break
  }
  return interleaved
}

// ---------------------------------------------------------------------------
// Rules hint (shown when a PERMISSION_DENIED error is detected)
// ---------------------------------------------------------------------------
const RULES_HINT = `   ⚠️ Error de permisos detectado. Actualiza las Firestore Rules:
   En /users/{userId} añade: || isAdmin()
   Función: function isAdmin() {
     return request.auth != null &&
       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
   }`

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SeedAdmin() {
  const [log, setLog] = useState<string[]>([])
  const [running, setRunning] = useState(false)

  function addLog(msg: string) {
    setLog((prev) => [...prev, msg])
  }

  async function isAlreadySeeded(): Promise<boolean> {
    const snap = await getDocs(
      query(collection(db, 'users'), where('email', '==', 'pedro@seed.test')),
    )
    return !snap.empty
  }

  // -------------------------------------------------------------------------
  // Seed
  // -------------------------------------------------------------------------
  async function handleSeed() {
    if (running) return
    setRunning(true)
    setLog([])
    let hasPermissionError = false

    function logError(step: string, err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      addLog(`   ✗ ${step}: ${msg}`)
      if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
        hasPermissionError = true
      }
    }

    try {
      if (await isAlreadySeeded()) {
        addLog('⚠️ Los datos de prueba ya existen. Usa "Limpiar datos" primero si quieres reconstruirlos.')
        return
      }

      // 1. Achievements (fixed IDs → idempotent)
      addLog('📋 Creando logros...')
      for (const ach of SEED_ACHIEVEMENTS) {
        try {
          const { id, ...data } = ach
          await setDoc(doc(db, 'achievements', id), data)
          addLog(`   ✓ ${ach.icon} ${ach.name}`)
        } catch (e) { logError(ach.name, e) }
      }

      // 2. Virtual user profiles (no Firebase Auth)
      addLog('👤 Creando usuarios virtuales...')
      const now = Timestamp.now()
      let usersCreated = 0
      for (const u of SEED_USERS) {
        try {
          await setDoc(doc(db, 'users', u.id), {
            username: u.username,
            email: u.email,
            bio: u.bio,
            photoURL: '',
            createdAt: now,
            role: 'user',
          })
          addLog(`   ✓ ${u.username}`)
          usersCreated++
        } catch (e) { logError(u.username, e) }
      }
      if (usersCreated === 0) {
        addLog('❌ No se pudo crear ningún usuario. Verifica las Firestore Rules (ver advertencia abajo).')
        if (hasPermissionError) addLog(RULES_HINT)
        return
      }

      // 3. Fetch & group real routes by zone
      addLog('🏔️  Cargando vías existentes...')
      const { routes } = await getRoutes()
      addLog(`   ${routes.length} vías encontradas`)
      if (routes.length < 10) {
        addLog('❌ Necesitas al menos 10 vías cargadas. Importa las rutas primero.')
        return
      }

      const routesByZone = new Map<string, Route[]>()
      for (const r of routes) {
        if (!routesByZone.has(r.zoneId)) routesByZone.set(r.zoneId, [])
        routesByZone.get(r.zoneId)!.push(r)
      }
      const numZones = routesByZone.size
      addLog(`   ${numZones} zona${numZones !== 1 ? 's' : ''} detectada${numZones !== 1 ? 's' : ''}`)
      if (numZones < 2) addLog('   ⚠️ Solo 1 zona — los logros zone_count no se desbloquearán')

      const interleaved = buildInterleaved(routesByZone)
      const largestZone = [...routesByZone.values()].sort((a, b) => b.length - a.length)[0]!
      const n = routes.length

      const userRoutes: Record<SeedUserId, Route[]> = {
        seed_pedro:  interleaved.slice(0, Math.min(55, n)),
        seed_javier: interleaved.slice(0, Math.min(25, n)),
        seed_maria:  interleaved.slice(0, Math.min(10, n)),
        seed_laura:  largestZone.slice(0, Math.min(9, largestZone.length)),
        seed_carlos: interleaved.slice(0, Math.min(1, n)),
        seed_ana:    [],
      }

      // 4. Create ascents
      addLog('🧗 Creando ascensiones...')
      for (let ui = 0; ui < SEED_USERS.length; ui++) {
        const user = SEED_USERS[ui]!
        const userId = user.id
        const assignedRoutes = userRoutes[userId]
        let ok = 0

        for (let ri = 0; ri < assignedRoutes.length; ri++) {
          try {
            await createAscent({
              userId,
              routeId: assignedRoutes[ri]!.id,
              date: ascentTimestamp(ri, assignedRoutes.length, ui),
              rating: deterministicRating(ri, ui),
              comment: ASCENT_COMMENTS[(ri + ui * 3) % ASCENT_COMMENTS.length] ?? '',
              partners: getPartners(userId, ri),
              photos: [],
            })
            ok++
          } catch (e) { logError(`ascent ${ri} ${userId}`, e) }
        }

        if (userId === 'seed_carlos' && assignedRoutes.length > 0) {
          try {
            await createAscent({
              userId,
              routeId: assignedRoutes[0]!.id,
              date: Timestamp.fromDate(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)),
              rating: 4,
              comment: 'Segunda vez. La vía sigue siendo preciosa.',
              partners: [],
              photos: [],
            })
            addLog(`   ✓ ${ok} vía única + 1 ascensión duplicada (dedup test) → ${user.username}`)
          } catch (e) { logError(`dup ascent ${userId}`, e) }
        } else if (userId === 'seed_ana') {
          addLog(`   ✓ 0 ascensiones → ${user.username} (prueba estado vacío)`)
        } else {
          addLog(`   ✓ ${ok} ascensiones → ${user.username}`)
        }
      }

      // 5. Follows + notifications
      addLog('🤝 Creando seguimientos y notificaciones...')
      const usernameById = Object.fromEntries(SEED_USERS.map((u) => [u.id, u.username]))
      let followsOk = 0
      for (const [followerId, followingId] of SEED_FOLLOWS) {
        try {
          await followUser(followerId, followingId)
          await createNotification({
            userId: followingId,
            type: 'follow',
            message: `${usernameById[followerId]} ha empezado a seguirte`,
            read: false,
          })
          followsOk++
        } catch (e) { logError(`follow ${followerId}→${followingId}`, e) }
      }
      addLog(`   ✓ ${followsOk}/${SEED_FOLLOWS.length} seguimientos con notificación`)

      // 6. Achievements
      addLog('🏆 Calculando logros desbloqueados...')
      for (const user of SEED_USERS) {
        try {
          const unlocked = await checkAchievements(user.id)
          addLog(`   ✓ ${user.username}: ${unlocked.length} logro${unlocked.length !== 1 ? 's' : ''} desbloqueado${unlocked.length !== 1 ? 's' : ''}`)
        } catch (e) { logError(`checkAchievements ${user.username}`, e) }
      }

      addLog('')
      addLog('✅ ¡Entorno de prueba listo!')
      addLog('   • Sigue a PedroEscalado desde tu perfil para ver su actividad en el feed.')
      addLog('   • Comprueba el ranking para ver los 6 usuarios con puntuaciones diferenciadas.')
      addLog('   • AnaPrimeros tiene 0 ascensiones → prueba todos los estados vacíos.')
      if (hasPermissionError) addLog(RULES_HINT)
    } catch (err) {
      addLog(`❌ Error inesperado: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setRunning(false)
    }
  }

  // -------------------------------------------------------------------------
  // Clear
  // -------------------------------------------------------------------------
  async function handleClear() {
    if (running) return
    if (!confirm('¿Seguro que quieres eliminar todos los datos de prueba? Esta acción no se puede deshacer.')) return

    setRunning(true)
    setLog(['🗑️  Limpiando datos de prueba...'])
    let hasPermissionError = false

    function logErr(step: string, err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      addLog(`   ✗ ${step}: ${msg}`)
      if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) hasPermissionError = true
    }

    // Users (each independently)
    let usersDeleted = 0
    for (const userId of SEED_USER_IDS) {
      try {
        await deleteDoc(doc(db, 'users', userId))
        usersDeleted++
      } catch (e) { logErr(`usuario ${userId}`, e) }
    }
    addLog(`✓ Usuarios eliminados (${usersDeleted}/${SEED_USER_IDS.length})`)

    // Achievements (each independently — always runs regardless of users result)
    let achDeleted = 0
    for (const ach of SEED_ACHIEVEMENTS) {
      try {
        await deleteDoc(doc(db, 'achievements', ach.id))
        achDeleted++
      } catch (e) { logErr(`logro ${ach.id}`, e) }
    }
    addLog(`✓ Logros de seed eliminados (${achDeleted}/${SEED_ACHIEVEMENTS.length})`)

    // Ascents, userAchievements, follows, notifications
    let docsDeleted = 0
    for (const userId of SEED_USER_IDS) {
      try {
        const [ascSnap, uaSnap, followerSnap, followingSnap, notifSnap] = await Promise.all([
          getDocs(query(collection(db, 'ascents'), where('userId', '==', userId))),
          getDocs(query(collection(db, 'userAchievements'), where('userId', '==', userId))),
          getDocs(query(collection(db, 'follows'), where('followerId', '==', userId))),
          getDocs(query(collection(db, 'follows'), where('followingId', '==', userId))),
          getDocs(query(collection(db, 'notifications'), where('userId', '==', userId))),
        ])
        const all = [...ascSnap.docs, ...uaSnap.docs, ...followerSnap.docs, ...followingSnap.docs, ...notifSnap.docs]
        await Promise.all(all.map((d) => deleteDoc(d.ref)))
        docsDeleted += all.length
      } catch (e) { logErr(`datos de ${userId}`, e) }
    }
    addLog(`✓ Ascensiones, logros, seguimientos y notificaciones eliminados (${docsDeleted} documentos)`)

    addLog('')
    if (hasPermissionError) {
      addLog('⚠️ Algunos documentos no se pudieron eliminar por permisos.')
      addLog(RULES_HINT)
    } else {
      addLog('✅ Datos de prueba eliminados.')
    }

    setRunning(false)
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const ROUTE_COUNTS = [55, 25, 10, 9, '1 (+dup)', 0] as const
  const EXPECTED_ACHIEVEMENTS: Record<SeedUserId, string> = {
    seed_pedro:  'Primeros pasos, 10/25/50 Clásicas, Explorador, Nómada',
    seed_javier: 'Primeros pasos, 10/25 Clásicas, Explorador',
    seed_maria:  'Primeros pasos, 10 Clásicas, Explorador',
    seed_laura:  'Primeros pasos (zona única — sin Explorador)',
    seed_carlos: 'Primeros pasos (dedup: 1 vía única)',
    seed_ana:    'Sin logros (0 ascensiones)',
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-1">Datos de prueba — Entorno Social</h2>
      <p className="text-sm text-gray-500 mb-6">
        Crea 6 usuarios virtuales con ascensiones, logros y seguimientos para probar toda la funcionalidad social.
        No modifica vías, zonas ni paredes existentes.
      </p>

      {/* Users preview */}
      <div className="card mb-4">
        <h3 className="text-sm font-semibold mb-3 text-gray-700">Usuarios y casos de prueba</h3>
        <div className="space-y-3">
          {SEED_USERS.map((u, i) => (
            <div key={u.id} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {u.username[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{u.username}
                  <span className="ml-2 text-xs font-normal text-gray-400">{ROUTE_COUNTS[i]} vías</span>
                </p>
                <p className="text-xs text-gray-400 truncate">{EXPECTED_ACHIEVEMENTS[u.id]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Follow network */}
      <div className="card mb-4">
        <h3 className="text-sm font-semibold mb-2 text-gray-700">Red de seguimientos</h3>
        <p className="text-xs text-gray-500">
          Mutuos: Pedro↔Javier, Pedro↔María, Javier↔María &nbsp;·&nbsp;
          Unidireccionales: Laura→Pedro/María, Carlos→Pedro/Javier &nbsp;·&nbsp;
          Aislada: Ana (sin seguimientos)
        </p>
      </div>

      {/* Achievement preview */}
      <div className="card mb-6">
        <h3 className="text-sm font-semibold mb-3 text-gray-700">Logros que se crearán</h3>
        <div className="grid grid-cols-2 gap-2">
          {SEED_ACHIEVEMENTS.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-sm">
              <span className="text-lg">{a.icon}</span>
              <div>
                <p className="font-medium text-xs">{a.name}</p>
                <p className="text-xs text-gray-400">{a.points} pts · umbral {a.threshold ?? '–'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleSeed}
          disabled={running}
          className="btn-primary flex items-center gap-2"
        >
          {running ? <Spinner /> : <Play className="h-4 w-4" />}
          Crear datos de prueba
        </button>
        <button
          onClick={handleClear}
          disabled={running}
          className="btn-secondary flex items-center gap-2 text-danger border-danger hover:bg-danger/10"
        >
          <Trash2 className="h-4 w-4" />
          Limpiar datos
        </button>
      </div>

      {/* Log */}
      {log.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs text-gray-100 space-y-0.5 max-h-80 overflow-y-auto">
          {log.map((line, i) => (
            <p
              key={i}
              className={
                line.startsWith('✅') ? 'text-green-400' :
                line.startsWith('❌') ? 'text-red-400' :
                line.startsWith('⚠️') ? 'text-yellow-400' :
                line === '' ? 'h-2' :
                'text-gray-200'
              }
            >
              {line || '\u00a0'}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
