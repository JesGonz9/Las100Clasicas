import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Mountain, MapPinned, Layers, ChevronDown, ChevronRight, ArrowDownAZ, ArrowUpAZ, ArrowDown01, ArrowUp01, CheckCircle } from 'lucide-react'
import { getRoutes, getZones, getWalls, getAscents } from '@/services/firebase'
import { useAuth } from '@/hooks'
import { Spinner, EmptyState } from '@/components'
import type { Route, Zone, Wall } from '@/models'
import { cn } from '@/utils'

type ViewMode = 'all' | 'zones' | 'walls'
type SortMode = 'alpha-asc' | 'alpha-desc' | 'length-asc' | 'length-desc'
type StatusFilter = 'todas' | 'hechas'

function applySortRoutes(routes: Route[], sort: SortMode) {
  const sorted = [...routes]
  switch (sort) {
    case 'alpha-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'))
      break
    case 'alpha-desc':
      sorted.sort((a, b) => b.name.localeCompare(a.name, 'es'))
      break
    case 'length-asc':
      sorted.sort((a, b) => (a.length || 0) - (b.length || 0))
      break
    case 'length-desc':
      sorted.sort((a, b) => (b.length || 0) - (a.length || 0))
      break
  }
  return sorted
}

export function RoutesListPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [walls, setWalls] = useState<Wall[]>([])
  const [ascendedIds, setAscendedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedZone, setSelectedZone] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [sortMode, setSortMode] = useState<SortMode>('alpha-asc')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas')
  const { user } = useAuth()

  useEffect(() => {
    async function load() {
      const [routesData, zonesData, wallsData] = await Promise.all([getRoutes(), getZones(), getWalls()])
      setRoutes(routesData.routes)
      setZones(zonesData)
      setWalls(wallsData)
      if (user) {
        const { ascents } = await getAscents(undefined, user.id)
        setAscendedIds(new Set(ascents.map((a) => a.routeId)))
      }
      setLoading(false)
    }
    load()
  }, [user])

  const filtered = routes.filter((r) => {
    const q = search.toLowerCase()
    const zoneName = zones.find((z) => z.id === r.zoneId)?.name?.toLowerCase() ?? ''
    const wallName = walls.find((w) => w.id === r.wallId)?.name?.toLowerCase() ?? ''
    const matchesSearch = r.name.toLowerCase().includes(q) || zoneName.includes(q) || wallName.includes(q)
    const matchesZone = !selectedZone || r.zoneId === selectedZone
    return matchesSearch && matchesZone
  })

  const afterStatus = statusFilter === 'hechas'
    ? filtered.filter((r) => ascendedIds.has(r.id))
    : filtered

  const sorted = applySortRoutes(afterStatus, sortMode)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Vías</h1>
        <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </button>
      </div>

      {/* View mode tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {([
          { key: 'all' as const, label: 'Todas', icon: Mountain },
          { key: 'zones' as const, label: 'Por zona', icon: MapPinned },
          { key: 'walls' as const, label: 'Por pared', icon: Layers },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => {
              setViewMode(key)
              if (key !== 'all' && sortMode.startsWith('length')) setSortMode('alpha-asc')
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Status filter tabs */}
      {viewMode === 'all' && (
        <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
          {([
            { key: 'todas' as const, label: 'Todas' },
            { key: 'hechas' as const, label: 'Hechas' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                statusFilter === key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {key === 'hechas' ? <CheckCircle className="h-4 w-4" /> : <Mountain className="h-4 w-4" />}
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, zona o pared..."
          className="input pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Sort selector */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSortMode((s) => s === 'alpha-asc' ? 'alpha-desc' : 'alpha-asc')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors', sortMode.startsWith('alpha') ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
        >
          {sortMode === 'alpha-desc' ? <ArrowUpAZ className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />}
          Alfabético
        </button>
        {viewMode === 'all' && (
          <button
            onClick={() => setSortMode((s) => s === 'length-asc' ? 'length-desc' : 'length-asc')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors', sortMode.startsWith('length') ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
          >
            {sortMode === 'length-desc' ? <ArrowUp01 className="h-4 w-4" /> : <ArrowDown01 className="h-4 w-4" />}
            Longitud
          </button>
        )}
      </div>

      {showFilters && viewMode === 'all' && (
        <div className="card mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedZone('')}
            className={cn('badge cursor-pointer', !selectedZone ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700')}
          >
            Todas
          </button>
          {zones.map((z) => (
            <button
              key={z.id}
              onClick={() => setSelectedZone(z.id)}
              className={cn(
                'badge cursor-pointer',
                selectedZone === z.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700',
              )}
            >
              {z.name}
            </button>
          ))}
        </div>
      )}

      {viewMode === 'all' && (
        sorted.length === 0 ? (
          <EmptyState
            icon={<Mountain className="h-12 w-12" />}
            title="No se encontraron vías"
            description="Prueba con otros filtros o términos de búsqueda"
          />
        ) : (
          <div className="space-y-3">
            {sorted.map((route, i) => (
              <RouteCard key={route.id} route={route} zones={zones} walls={walls} index={i + 1} ascended={ascendedIds.has(route.id)} />
            ))}
          </div>
        )
      )}

      {viewMode === 'zones' && (
        <GroupedByZones routes={sorted} zones={zones} walls={walls} ascending={sortMode !== 'alpha-desc'} ascendedIds={ascendedIds} />
      )}

      {viewMode === 'walls' && (
        <GroupedByWalls routes={sorted} zones={zones} walls={walls} ascending={sortMode !== 'alpha-desc'} ascendedIds={ascendedIds} />
      )}
    </div>
  )
}

function GroupedByZones({ routes, zones, walls, ascending, ascendedIds }: { routes: Route[]; zones: Zone[]; walls: Wall[]; ascending: boolean; ascendedIds: Set<string> }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const zonesWithRoutes = zones
    .map((z) => ({ zone: z, routes: routes.filter((r) => r.zoneId === z.id) }))
    .filter((g) => g.routes.length > 0)

  zonesWithRoutes.sort((a, b) => ascending
    ? a.zone.name.localeCompare(b.zone.name, 'es')
    : b.zone.name.localeCompare(a.zone.name, 'es'))

  const unzoned = routes.filter((r) => !r.zoneId)

  if (zonesWithRoutes.length === 0 && unzoned.length === 0) {
    return <EmptyState icon={<MapPinned className="h-12 w-12" />} title="No hay vías" description="No se encontraron vías con los filtros actuales" />
  }

  return (
    <div className="space-y-2">
      {zonesWithRoutes.map(({ zone, routes: zoneRoutes }) => (
        <div key={zone.id} className="card overflow-hidden">
          <button
            onClick={() => toggle(zone.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MapPinned className="h-5 w-5 text-primary" />
              <span className="font-semibold">{zone.name}</span>
              <span className="badge bg-gray-100 text-gray-600">{zoneRoutes.length} vías</span>
            </div>
            {expanded.has(zone.id) ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          </button>
          {expanded.has(zone.id) && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {zoneRoutes.map((route, i) => (
                <div key={route.id} className="px-4 py-2">
                  <RouteCard route={route} zones={zones} walls={walls} compact index={i + 1} ascended={ascendedIds.has(route.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {unzoned.length > 0 && (
        <div className="card overflow-hidden">
          <button
            onClick={() => toggle('__none__')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MapPinned className="h-5 w-5 text-gray-400" />
              <span className="font-semibold text-gray-500">Sin zona</span>
              <span className="badge bg-gray-100 text-gray-600">{unzoned.length} vías</span>
            </div>
            {expanded.has('__none__') ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          </button>
          {expanded.has('__none__') && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {unzoned.map((route, i) => (
                <div key={route.id} className="px-4 py-2">
                  <RouteCard route={route} zones={zones} walls={walls} compact index={i + 1} ascended={ascendedIds.has(route.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GroupedByWalls({ routes, zones, walls, ascending, ascendedIds }: { routes: Route[]; zones: Zone[]; walls: Wall[]; ascending: boolean; ascendedIds: Set<string> }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const wallsWithRoutes = walls
    .map((w) => ({
      wall: w,
      zone: zones.find((z) => z.id === w.zoneId),
      routes: routes.filter((r) => r.wallId === w.id),
    }))
    .filter((g) => g.routes.length > 0)

  wallsWithRoutes.sort((a, b) => ascending
    ? a.wall.name.localeCompare(b.wall.name, 'es')
    : b.wall.name.localeCompare(a.wall.name, 'es'))

  const unwalled = routes.filter((r) => !r.wallId)

  if (wallsWithRoutes.length === 0 && unwalled.length === 0) {
    return <EmptyState icon={<Layers className="h-12 w-12" />} title="No hay vías" description="No se encontraron vías con los filtros actuales" />
  }

  return (
    <div className="space-y-2">
      {wallsWithRoutes.map(({ wall, zone, routes: wallRoutes }) => (
        <div key={wall.id} className="card overflow-hidden">
          <button
            onClick={() => toggle(wall.id)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Layers className="h-5 w-5 text-primary" />
              <div className="text-left">
                <span className="font-semibold">{wall.name}</span>
                {zone && <span className="text-sm text-gray-500 ml-2">({zone.name})</span>}
              </div>
              <span className="badge bg-gray-100 text-gray-600">{wallRoutes.length} vías</span>
            </div>
            {expanded.has(wall.id) ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          </button>
          {expanded.has(wall.id) && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {wallRoutes.map((route, i) => (
                <div key={route.id} className="px-4 py-2">
                  <RouteCard route={route} zones={zones} walls={walls} compact index={i + 1} ascended={ascendedIds.has(route.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {unwalled.length > 0 && (
        <div className="card overflow-hidden">
          <button
            onClick={() => toggle('__none__')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Layers className="h-5 w-5 text-gray-400" />
              <span className="font-semibold text-gray-500">Sin pared</span>
              <span className="badge bg-gray-100 text-gray-600">{unwalled.length} vías</span>
            </div>
            {expanded.has('__none__') ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
          </button>
          {expanded.has('__none__') && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {unwalled.map((route, i) => (
                <div key={route.id} className="px-4 py-2">
                  <RouteCard route={route} zones={zones} walls={walls} compact index={i + 1} ascended={ascendedIds.has(route.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RouteCard({ route, zones, walls, compact, index, ascended }: { route: Route; zones: Zone[]; walls: Wall[]; compact?: boolean; index?: number; ascended?: boolean }) {
  const zone = zones.find((z) => z.id === route.zoneId)
  const wall = walls.find((w) => w.id === route.wallId)

  return (
    <Link to={`/routes/${route.id}`} className={cn('block transition-colors', !compact && 'card hover:shadow-md', ascended ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'hover:bg-gray-50')}>
      <div className="flex items-center gap-3 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">
                {index != null && <span className="text-gray-400 mr-1">{index}.</span>}
                {route.name}
              </h3>
              {ascended && <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />}
            </div>
            {(zone || wall) && (
              <p className="text-xs text-gray-500 truncate">
                {wall?.name}{zone ? ` · ${zone.name}` : ''}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {route.difficulty.free && (
              <span className="badge bg-blue-100 text-blue-800">{route.difficulty.free}</span>
            )}
            {route.difficulty.mandatory && (
              <span className="badge bg-orange-100 text-orange-800">{route.difficulty.mandatory}</span>
            )}
            {route.difficulty.aid && (
              <span className="badge bg-purple-100 text-purple-800">{route.difficulty.aid}</span>
            )}
            <span className="text-xs text-gray-400 ml-1">{route.length}m</span>
          </div>
        </div>
    </Link>
  )
}
