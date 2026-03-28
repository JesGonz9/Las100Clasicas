import { useState, useEffect, type FormEvent } from 'react'
import { Plus, Trash2, Mountain, MapPinned, Trophy, Users, Upload, Layers, ChevronDown, Search } from 'lucide-react'
import {
  getRoutes,
  getZones,
  getWalls,
  createRoute,
  updateRoute,
  deleteRoute,
  createZone,
  updateZone,
  deleteZone,
  createWall,
  updateWall,
  deleteWall,
  getAchievements,
  createAchievement,
  deleteAchievement,
  getAllUsers,
} from '@/services/firebase'
import { Spinner } from '@/components'
import type { Route, Zone, Wall, Achievement } from '@/models'

type Tab = 'routes' | 'zones' | 'walls' | 'achievements' | 'users' | 'import'

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('routes')

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Administración</h1>

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {([
          { key: 'routes' as const, label: 'Vías', icon: Mountain },
          { key: 'zones' as const, label: 'Zonas', icon: MapPinned },
          { key: 'walls' as const, label: 'Paredes', icon: Layers },
          { key: 'achievements' as const, label: 'Logros', icon: Trophy },
          { key: 'users' as const, label: 'Usuarios', icon: Users },
          { key: 'import' as const, label: 'Importar', icon: Upload },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'routes' && <RoutesAdmin />}
      {tab === 'zones' && <ZonesAdmin />}
      {tab === 'walls' && <WallsAdmin />}
      {tab === 'achievements' && <AchievementsAdmin />}
      {tab === 'users' && <UsersAdmin />}
      {tab === 'import' && <ImportAdmin />}
    </div>
  )
}

const FREE_GRADES = [
  '', 'II', 'II+', 'III', 'III+', 'IV', 'IV+', 'V', 'V+',
  '6a', '6a+', '6b', '6b+', '6c', '6c+',
  '7a', '7a+', '7b', '7b+', '7c', '7c+',
  '8a', '8a+', '8b', '8b+', '8c', '8c+',
  '9a', '9a+', '9b',
]

const AID_GRADES = [
  '', 'A0', 'A1', 'A1+', 'A2', 'A2+', 'A3', 'A3+', 'A4', 'A4+', 'A5',
]

function RoutesAdmin() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [walls, setWalls] = useState<Wall[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | null>(null)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [wallId, setWallId] = useState('')
  const [description, setDescription] = useState('')
  const [freeGrade, setFreeGrade] = useState('')
  const [mandatoryGrade, setMandatoryGrade] = useState('')
  const [aidGrade, setAidGrade] = useState('')
  const [length, setLength] = useState('')

  useEffect(() => {
    async function load() {
      const [r, z, w] = await Promise.all([getRoutes(), getZones(), getWalls()])
      setRoutes(r.routes)
      setZones(z)
      setWalls(w)
      setLoading(false)
    }
    load()
  }, [])

  function resetForm() {
    setName('')
    setZoneId('')
    setWallId('')
    setDescription('')
    setFreeGrade('')
    setMandatoryGrade('')
    setAidGrade('')
    setLength('')
    setEditingRoute(null)
    setShowForm(false)
  }

  function startEdit(route: Route) {
    setEditingRoute(route)
    setName(route.name)
    setZoneId(route.zoneId)
    setWallId(route.wallId ?? '')
    setDescription(route.description)
    setFreeGrade(route.difficulty.free)
    setMandatoryGrade(route.difficulty.mandatory)
    setAidGrade(route.difficulty.aid)
    setLength(String(route.length))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const data = {
      name,
      zoneId,
      wallId,
      description,
      difficulty: { free: freeGrade, mandatory: mandatoryGrade, aid: aidGrade },
      length: Number(length) || 0,
      images: editingRoute?.images ?? [],
      externalLinks: editingRoute?.externalLinks ?? [],
    }

    if (editingRoute) {
      await updateRoute(editingRoute.id, data)
    } else {
      await createRoute(data)
    }

    const updated = await getRoutes()
    setRoutes(updated.routes)
    resetForm()
  }

  async function handleDelete(id: string) {
    await deleteRoute(id)
    setRoutes(routes.filter((r) => r.id !== id))
  }

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner /></div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Vías ({routes.length})</h2>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nueva vía
          <ChevronDown className={`h-4 w-4 transition-transform ${showForm ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, zona o pared..."
          className="input pl-10 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showForm && !editingRoute && (
        <form onSubmit={handleSubmit} className="card mb-4 space-y-3">
          <input className="input" placeholder="Ej: Espolón de los Franceses" value={name} onChange={(e) => setName(e.target.value)} required />
          <select className="input" value={zoneId} onChange={(e) => { setZoneId(e.target.value); setWallId('') }} required>
            <option value="">— Zona —</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
          <select className="input" value={wallId} onChange={(e) => setWallId(e.target.value)}>
            <option value="">— Pared (opcional) —</option>
            {walls.filter((w) => w.zoneId === zoneId).map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <textarea className="input" placeholder="Ej: Ruta clásica por la cara oeste..." value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Grado libre</label>
              <select className="input" value={freeGrade} onChange={(e) => setFreeGrade(e.target.value)}>
                <option value="">—</option>
                {FREE_GRADES.filter(Boolean).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Obligatorio</label>
              <select className="input" value={mandatoryGrade} onChange={(e) => setMandatoryGrade(e.target.value)}>
                <option value="">—</option>
                {FREE_GRADES.filter(Boolean).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Artificial</label>
              <select className="input" value={aidGrade} onChange={(e) => setAidGrade(e.target.value)}>
                <option value="">—</option>
                {AID_GRADES.filter(Boolean).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
          <input className="input" type="number" placeholder="Ej: 500" value={length} onChange={(e) => setLength(e.target.value)} />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Crear</button>
            <button type="button" onClick={resetForm} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {routes.filter((r) => {
          if (!search.trim()) return true
          const q = search.toLowerCase()
          const zoneName = zones.find((z) => z.id === r.zoneId)?.name?.toLowerCase() ?? ''
          const wallName = walls.find((w) => w.id === r.wallId)?.name?.toLowerCase() ?? ''
          return r.name.toLowerCase().includes(q) || zoneName.includes(q) || wallName.includes(q)
        }).map((r) => {
          const zone = zones.find((z) => z.id === r.zoneId)
          const wall = walls.find((w) => w.id === r.wallId)
          const isEditing = editingRoute?.id === r.id
          return (
            <div key={r.id} className="card overflow-hidden cursor-pointer" onClick={() => isEditing ? resetForm() : startEdit(r)}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{r.name}</h3>
                  {(zone || wall) && (
                    <p className="text-xs text-gray-500 truncate">
                      {zone?.name}{wall ? ` · ${wall.name}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {r.difficulty.free && (
                    <span className="badge bg-blue-100 text-blue-800">{r.difficulty.free}</span>
                  )}
                  {r.difficulty.mandatory && (
                    <span className="badge bg-orange-100 text-orange-800">{r.difficulty.mandatory}</span>
                  )}
                  {r.difficulty.aid && (
                    <span className="badge bg-purple-100 text-purple-800">{r.difficulty.aid}</span>
                  )}
                  <span className="text-xs text-gray-400 ml-1">{r.length}m</span>
                </div>
                <div className="flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id) }} className="text-gray-400 hover:text-danger transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {isEditing && (
                <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  <input className="input" placeholder="Ej: Espolón de los Franceses" value={name} onChange={(e) => setName(e.target.value)} required />
                  <select className="input" value={zoneId} onChange={(e) => { setZoneId(e.target.value); setWallId('') }} required>
                    <option value="">— Zona —</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                  <select className="input" value={wallId} onChange={(e) => setWallId(e.target.value)}>
                    <option value="">— Pared (opcional) —</option>
                    {walls.filter((w) => w.zoneId === zoneId).map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                  <textarea className="input" placeholder="Ej: Ruta clásica por la cara oeste..." value={description} onChange={(e) => setDescription(e.target.value)} />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Grado libre</label>
                      <select className="input" value={freeGrade} onChange={(e) => setFreeGrade(e.target.value)}>
                        <option value="">—</option>
                        {FREE_GRADES.filter(Boolean).map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Obligatorio</label>
                      <select className="input" value={mandatoryGrade} onChange={(e) => setMandatoryGrade(e.target.value)}>
                        <option value="">—</option>
                        {FREE_GRADES.filter(Boolean).map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Artificial</label>
                      <select className="input" value={aidGrade} onChange={(e) => setAidGrade(e.target.value)}>
                        <option value="">—</option>
                        {AID_GRADES.filter(Boolean).map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <input className="input" type="number" placeholder="Ej: 500" value={length} onChange={(e) => setLength(e.target.value)} />
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary">Guardar cambios</button>
                    <button type="button" onClick={resetForm} className="btn-secondary">Cancelar</button>
                  </div>
                </form>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ZonesAdmin() {
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  useEffect(() => {
    getZones().then((z) => {
      setZones(z)
      setLoading(false)
    })
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createZone(name.trim())
    const updated = await getZones()
    setZones(updated)
    setName('')
    setShowForm(false)
  }

  function startEdit(z: Zone) {
    if (editingId === z.id) {
      setEditingId(null)
      return
    }
    setEditingId(z.id)
    setEditName(z.name)
  }

  async function handleSave(id: string) {
    if (!editName.trim()) return
    await updateZone(id, { name: editName.trim() })
    const updated = await getZones()
    setZones(updated)
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    await deleteZone(id)
    setZones(zones.filter((z) => z.id !== id))
  }

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner /></div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Zonas ({zones.length})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Añadir zona
          <ChevronDown className={`h-4 w-4 transition-transform ${showForm ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {showForm && (
          <form onSubmit={handleCreate} className="card mt-3 space-y-3">
            <input className="input" placeholder="Ej: Picos de Europa" value={name} onChange={(e) => setName(e.target.value)} required />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Crear</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        )}

      <div className="relative mb-4 mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar zona..."
          className="input pl-10 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {zones.filter((z) => !search.trim() || z.name.toLowerCase().includes(search.toLowerCase())).map((z) => (
          <div key={z.id} className="card overflow-hidden cursor-pointer" onClick={() => startEdit(z)}>
            <div className="flex items-center justify-between">
              <span className="flex-1 text-left font-medium">{z.name}</span>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(z.id) }} className="text-gray-400 hover:text-danger transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {editingId === z.id && (
              <div onClick={(e) => e.stopPropagation()} className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                <div className="flex gap-2">
                  <button onClick={() => handleSave(z.id)} className="btn-primary">Guardar cambios</button>
                  <button onClick={() => setEditingId(null)} className="btn-secondary">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function WallsAdmin() {
  const [walls, setWalls] = useState<Wall[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [coords, setCoords] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editZoneId, setEditZoneId] = useState('')
  const [editCoords, setEditCoords] = useState('')

  useEffect(() => {
    Promise.all([getWalls(), getZones()]).then(([w, z]) => {
      setWalls(w)
      setZones(z)
      setLoading(false)
    })
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || !zoneId) return
    const parts = coords.split(',').map((s) => s.trim())
    const lat = parseFloat(parts[0] ?? '')
    const lng = parseFloat(parts[1] ?? '')
    await createWall(name.trim(), zoneId, {
      lat: isNaN(lat) ? 0 : lat,
      lng: isNaN(lng) ? 0 : lng,
    })
    const updated = await getWalls()
    setWalls(updated)
    setName('')
    setZoneId('')
    setCoords('')
    setShowForm(false)
  }

  function startEdit(w: Wall) {
    if (editingId === w.id) {
      setEditingId(null)
      return
    }
    setEditingId(w.id)
    setEditName(w.name)
    setEditZoneId(w.zoneId)
    const c = w.coordinates
    setEditCoords(c && (c.lat || c.lng) ? `${c.lat}, ${c.lng}` : '')
  }

  async function handleSave(id: string) {
    if (!editName.trim() || !editZoneId) return
    const parts = editCoords.split(',').map((s) => s.trim())
    const lat = parseFloat(parts[0] ?? '')
    const lng = parseFloat(parts[1] ?? '')
    await updateWall(id, {
      name: editName.trim(),
      zoneId: editZoneId,
      coordinates: { lat: isNaN(lat) ? 0 : lat, lng: isNaN(lng) ? 0 : lng },
    })
    const updated = await getWalls()
    setWalls(updated)
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    await deleteWall(id)
    setWalls(walls.filter((w) => w.id !== id))
  }

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner /></div>

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Paredes ({walls.length})</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Añadir pared
          <ChevronDown className={`h-4 w-4 transition-transform ${showForm ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {showForm && (
          <form onSubmit={handleCreate} className="card mt-3 space-y-3">
            <select className="input" value={zoneId} onChange={(e) => setZoneId(e.target.value)} required>
              <option value="">— Zona —</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
            <input className="input" placeholder="Ej: Cara Oeste" value={name} onChange={(e) => setName(e.target.value)} required />
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Coordenadas</label>
              <input className="input" type="text" placeholder="Ej: 42.608840, -5.572188" value={coords} onChange={(e) => setCoords(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Pega directamente desde Google Maps (clic derecho → coordenadas)</p>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Crear</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
            </div>
          </form>
        )}

      <div className="relative mb-4 mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o zona..."
          className="input pl-10 text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {walls.filter((w) => {
          if (!search.trim()) return true
          const q = search.toLowerCase()
          const zoneName = zones.find((z) => z.id === w.zoneId)?.name?.toLowerCase() ?? ''
          return w.name.toLowerCase().includes(q) || zoneName.includes(q)
        }).map((w) => {
          const zone = zones.find((z) => z.id === w.zoneId)
          return (
            <div key={w.id} className="card overflow-hidden cursor-pointer" onClick={() => startEdit(w)}>
              <div className="flex items-center justify-between">
                <div className="flex-1 text-left">
                  <span className="font-medium">{w.name}</span>
                  {zone && <span className="text-sm text-gray-500 ml-2">({zone.name})</span>}
                  {(!w.coordinates || (!w.coordinates.lat && !w.coordinates.lng)) && (
                    <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Sin coordenadas</span>
                  )}
                  {!zone && (
                    <span className="ml-2 text-xs text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Sin zona</span>
                  )}
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(w.id) }} className="text-gray-400 hover:text-danger transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {editingId === w.id && (
                <div onClick={(e) => e.stopPropagation()} className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                  <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                  <select className="input" value={editZoneId} onChange={(e) => setEditZoneId(e.target.value)} required>
                    <option value="">— Zona —</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Coordenadas</label>
                    <input className="input" type="text" placeholder="Ej: 42.608840, -5.572188" value={editCoords} onChange={(e) => setEditCoords(e.target.value)} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSave(w.id)} className="btn-primary">Guardar cambios</button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AchievementsAdmin() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [condition, setCondition] = useState('')

  useEffect(() => {
    getAchievements().then((a) => {
      setAchievements(a)
      setLoading(false)
    })
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    await createAchievement({ name, description, condition })
    const updated = await getAchievements()
    setAchievements(updated)
    setName('')
    setDescription('')
    setCondition('')
  }

  async function handleDelete(id: string) {
    await deleteAchievement(id)
    setAchievements(achievements.filter((a) => a.id !== id))
  }

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner /></div>

  return (
    <div>
      <form onSubmit={handleCreate} className="card mb-4 space-y-3">
        <input className="input" placeholder="Ej: Nombre del logro" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" placeholder="Ej: Escalar 10 vías" value={description} onChange={(e) => setDescription(e.target.value)} required />
        <input className="input" placeholder="Ej: ascents >= 10" value={condition} onChange={(e) => setCondition(e.target.value)} required />
        <button type="submit" className="btn-primary flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Crear logro
        </button>
      </form>

      <div className="space-y-2">
        {achievements.map((a) => (
          <div key={a.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium">{a.name}</p>
              <p className="text-sm text-gray-500">{a.description}</p>
            </div>
            <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-danger transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function UsersAdmin() {
  const [users, setUsers] = useState<Array<{ id: string; username?: string; email?: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAllUsers().then((u) => {
      setUsers(u as Array<{ id: string; username?: string; email?: string }>)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Spinner /></div>

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div key={u.id} className="card flex items-center justify-between">
          <div>
            <p className="font-medium">{u.username ?? 'Sin nombre'}</p>
            <p className="text-sm text-gray-500">{u.email}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

const IMPORT_EXAMPLE = `[
  {
    "name": "Espolón de los Franceses",
    "zone": "Picos de Europa",
    "wall": "Naranjo de Bulnes - Cara Oeste",
    "wallCoordinates": "43.202, -4.815",
    "description": "Clásica vía de escalada en el Naranjo de Bulnes con un desnivel impresionante.",
    "difficulty": {
      "free": "6a+",
      "mandatory": "V+",
      "aid": ""
    },
    "length": 500,
    "externalLinks": ["https://example.com/espolon"]
  },
  {
    "name": "Directa al Picu",
    "zone": "Picos de Europa",
    "wall": "Naranjo de Bulnes - Cara Sur",
    "wallCoordinates": "43.198, -4.820",
    "description": "Ruta directa por la cara sur.",
    "difficulty": {
      "free": "6b",
      "mandatory": "6a",
      "aid": "A1"
    },
    "length": 350,
    "externalLinks": []
  }
]`

function ImportAdmin() {
  const [jsonText, setJsonText] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [importing, setImporting] = useState(false)

  async function handleImport() {
    setStatus(null)
    let parsed: unknown[]
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      setStatus({ type: 'error', message: 'JSON inválido. Revisa el formato.' })
      return
    }

    if (!Array.isArray(parsed)) {
      setStatus({ type: 'error', message: 'El JSON debe ser un array de vías.' })
      return
    }

    setImporting(true)
    let created = 0
    let zonesCreated = 0
    let wallsCreated = 0
    const errors: string[] = []

    try {
      // Get existing zones and walls to match by name
      const existingZones = await getZones()
      const zoneMap = new Map(existingZones.map((z) => [z.name.toLowerCase(), z.id]))
      const existingWalls = await getWalls()
      const wallMap = new Map(existingWalls.map((w) => [`${w.name.toLowerCase()}::${w.zoneId}`, w.id]))

      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i] as Record<string, unknown>
        const routeName = String(item.name ?? '')
        if (!routeName) {
          errors.push(`Fila ${i + 1}: falta el campo "name"`)
          continue
        }

        // Resolve zone: create if doesn't exist
        let zoneId = ''
        const zoneName = String(item.zone ?? '').trim()
        if (zoneName) {
          const existing = zoneMap.get(zoneName.toLowerCase())
          if (existing) {
            zoneId = existing
          } else {
            const newZone = await createZone(zoneName)
            zoneId = newZone.id
            zoneMap.set(zoneName.toLowerCase(), zoneId)
            zonesCreated++
          }
        }

        // Resolve wall: create if doesn't exist
        let wallId = ''
        const wallName = String(item.wall ?? '').trim()
        if (wallName && zoneId) {
          const wallKey = `${wallName.toLowerCase()}::${zoneId}`
          const existingWall = wallMap.get(wallKey)
          if (existingWall) {
            wallId = existingWall
          } else {
            // Parse wall coordinates
            const coordStr = String(item.wallCoordinates ?? '')
            const coordParts = coordStr.split(',').map((s) => s.trim())
            const lat = parseFloat(coordParts[0] ?? '')
            const lng = parseFloat(coordParts[1] ?? '')
            const newWall = await createWall(wallName, zoneId, {
              lat: isNaN(lat) ? 0 : lat,
              lng: isNaN(lng) ? 0 : lng,
            })
            wallId = newWall.id
            wallMap.set(wallKey, wallId)
            wallsCreated++
          }
        }

        const diff = (item.difficulty ?? {}) as Record<string, string>

        await createRoute({
          name: routeName,
          zoneId,
          wallId,
          description: String(item.description ?? ''),
          difficulty: {
            free: String(diff.free ?? ''),
            mandatory: String(diff.mandatory ?? ''),
            aid: String(diff.aid ?? ''),
          },
          length: Number(item.length) || 0,
          images: [],
          externalLinks: Array.isArray(item.externalLinks) ? item.externalLinks.map(String) : [],
        })
        created++
      }

      const parts: string[] = [`${created} vías importadas correctamente`]
      if (zonesCreated > 0) parts.push(`${zonesCreated} zonas nuevas creadas`)
      if (wallsCreated > 0) parts.push(`${wallsCreated} paredes nuevas creadas`)
      if (errors.length > 0) parts.push(`${errors.length} errores`)
      setStatus({
        type: errors.length > 0 ? 'error' : 'success',
        message: parts.join('. ') + '.\n' + errors.join('\n'),
      })
      if (created > 0) setJsonText('')
    } catch (err) {
      setStatus({ type: 'error', message: `Error durante la importación: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Importar vías desde JSON</h2>
      <p className="text-sm text-gray-500 mb-4">
        Pega un JSON con el array de vías. Las zonas y paredes se crearán automáticamente si no existen.
      </p>

      {status && (
        <div className={`p-3 rounded-lg text-sm mb-4 whitespace-pre-wrap ${
          status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-danger'
        }`}>
          {status.message}
        </div>
      )}

      <textarea
        className="input font-mono text-sm min-h-[300px] resize-y"
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        placeholder={IMPORT_EXAMPLE}
      />

      <div className="flex gap-2 mt-4">
        <button
          onClick={handleImport}
          className="btn-primary flex items-center gap-2"
          disabled={importing || !jsonText.trim()}
        >
          <Upload className="h-4 w-4" />
          {importing ? 'Importando...' : 'Importar'}
        </button>
        <button
          onClick={() => setJsonText(IMPORT_EXAMPLE)}
          className="btn-secondary"
        >
          Cargar ejemplo
        </button>
      </div>
    </div>
  )
}
