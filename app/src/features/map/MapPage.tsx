import { useState, useEffect } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Mountain, Search, ArrowLeft } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getRoutes, getZones, getWalls, getAscents } from '@/services/firebase'
import { useAuth } from '@/hooks'
import { Spinner } from '@/components'
import type { Route, Zone, Wall } from '@/models'

// Fix default marker icon issue with bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = defaultIcon

type WallStatus = 'none' | 'partial' | 'complete'

function makeColoredIcon(status: WallStatus) {
  const color = status === 'complete' ? '#22c55e' : status === 'partial' ? '#f97316' : '#ef4444'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z"
            fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  })
}

function MapController({ focusWallId, walls }: { focusWallId: string | null; walls: Wall[] }) {
  const map = useMap()
  useEffect(() => {
    if (!focusWallId) return
    const wall = walls.find((w) => w.id === focusWallId)
    const lat = Number(wall?.coordinates?.lat)
    const lng = Number(wall?.coordinates?.lng)
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      map.flyTo([lat, lng], 15, { duration: 1 })
    }
  }, [focusWallId, walls, map])
  return null
}

export function MapPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [routes, setRoutes] = useState<Route[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [walls, setWalls] = useState<Wall[]>([])
  const [ascendedRouteIds, setAscendedRouteIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [focusWallId, setFocusWallId] = useState<string | null>(null)
  const wallIdParam = searchParams.get('wall')

  useEffect(() => {
    async function load() {
      const [routesData, zonesData, wallsData, ascentsData] = await Promise.all([
        getRoutes(),
        getZones(),
        getWalls(),
        user ? getAscents(undefined, user.id) : Promise.resolve({ ascents: [] }),
      ])
      setRoutes(routesData.routes)
      setZones(zonesData)
      setWalls(wallsData)
      setAscendedRouteIds(new Set(ascentsData.ascents.map((a) => a.routeId)))
      setLoading(false)
    }
    load()
  }, [user])

  // Al terminar de cargar, activar zoom sobre la pared indicada en ?wall=
  useEffect(() => {
    if (!loading && wallIdParam) {
      setFocusWallId(wallIdParam)
    }
  }, [loading, wallIdParam])

  // Al pinchar una vía del listado, centrar el mapa en su pared
  const handleRouteClick = (route: Route) => {
    setSelectedRoute(route)
    setFocusWallId(route.wallId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner />
      </div>
    )
  }

  // Center on Spain by default (climbing routes area)
  const defaultCenter: [number, number] = [40.4, -3.7]

  const filteredRoutes = routes.filter((r) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const zoneName = zones.find((z) => z.id === r.zoneId)?.name?.toLowerCase() ?? ''
    const wallName = walls.find((w) => w.id === r.wallId)?.name?.toLowerCase() ?? ''
    return r.name.toLowerCase().includes(q) || zoneName.includes(q) || wallName.includes(q)
  })

  const wallsWithCoords = walls.filter((w) => {
    const lat = Number(w.coordinates?.lat)
    const lng = Number(w.coordinates?.lng)
    return !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)
  })

  return (
    <div className="h-[calc(100vh-4rem)] md:h-screen relative">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md hover:bg-white transition-colors md:hidden"
        aria-label="Volver"
      >
        <ArrowLeft className="h-5 w-5 text-gray-700" />
      </button>
      {/* OpenStreetMap with Leaflet */}
      <MapContainer
        center={defaultCenter}
        zoom={6}
        className="absolute inset-0 z-0"
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController focusWallId={focusWallId} walls={walls} />

        {wallsWithCoords.map((wall) => {
          const wallRoutes = filteredRoutes.filter((r) => r.wallId === wall.id)
          if (wallRoutes.length === 0) return null
          const zone = zones.find((z) => z.id === wall.zoneId)
          const ascendedCount = wallRoutes.filter((r) => ascendedRouteIds.has(r.id)).length
          const status: WallStatus =
            ascendedCount === 0 ? 'none' : ascendedCount === wallRoutes.length ? 'complete' : 'partial'
          return (
            <Marker
              key={wall.id}
              position={[Number(wall.coordinates!.lat), Number(wall.coordinates!.lng)]}
              icon={makeColoredIcon(status)}
              eventHandlers={{ click: () => setSelectedRoute(wallRoutes[0] ?? null) }}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <h3 className="font-bold text-sm">{wall.name}</h3>
                  {zone && <p className="text-xs text-gray-500 mb-1">{zone.name}</p>}
                  <p className="text-xs text-gray-400 mb-2">
                    {ascendedCount}/{wallRoutes.length} vías completadas
                  </p>
                  <div className="space-y-1">
                    {wallRoutes.map((route) => {
                      const done = ascendedRouteIds.has(route.id)
                      return (
                        <div key={route.id} className="flex items-center justify-between gap-2">
                          <Link
                            to={`/routes/${route.id}`}
                            className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1"
                          >
                            {done && <span className="text-green-500">✓</span>}
                            {route.name}
                          </Link>
                          {route.difficulty.free && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded flex-shrink-0">
                              {route.difficulty.free}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Legend */}
      {user && (
        <div className="absolute bottom-24 right-4 md:bottom-8 bg-white/95 backdrop-blur-sm rounded-xl shadow-md z-[1000] p-3 text-xs space-y-1.5">
          <p className="font-semibold text-gray-700 mb-1">Progreso</p>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-gray-600">Todas completadas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500 flex-shrink-0" />
            <span className="text-gray-600">Algunas completadas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-gray-600">Ninguna completada</span>
          </div>
        </div>
      )}

      {/* Routes sidebar */}
      <div className="absolute top-4 left-4 w-80 max-h-[80vh] overflow-y-auto bg-white rounded-xl shadow-lg z-[1000] hidden md:block">
        <div className="p-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-xl space-y-2">
          <h3 className="font-bold">Vías ({filteredRoutes.length})</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, zona o pared..."
              className="input pl-10 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="p-2 space-y-1">
          {filteredRoutes.map((route) => {
            const zone = zones.find((z) => z.id === route.zoneId)
            const wall = walls.find((w) => w.id === route.wallId)
            return (
              <button
                key={route.id}
                onClick={() => handleRouteClick(route)}
                className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-medium truncate">{route.name}</p>
                {(zone || wall) && <p className="text-xs text-gray-500 truncate">{wall?.name}{zone ? ` · ${zone.name}` : ''}</p>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected route popup (mobile) */}
      {selectedRoute && (
        <div className="absolute bottom-20 left-4 right-4 bg-white rounded-xl shadow-lg z-[1000] p-4 md:hidden">
          <div className="flex items-start gap-3">
            <Mountain className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold">{selectedRoute.name}</h3>
              <p className="text-sm text-gray-500">{selectedRoute.difficulty.free}</p>
              <p className="text-sm text-gray-500">{selectedRoute.length}m</p>
              <div className="flex gap-2 mt-2">
                <Link to={`/routes/${selectedRoute.id}`} className="btn-primary text-sm">
                  Ver detalle
                </Link>
                <button onClick={() => setSelectedRoute(null)} className="btn-secondary text-sm">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
