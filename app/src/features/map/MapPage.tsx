import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Mountain, Search } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getRoutes, getZones, getWalls } from '@/services/firebase'
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

function FlyToRoute({ route, walls }: { route: Route | null; walls: Wall[] }) {
  const map = useMap()
  useEffect(() => {
    if (!route) return
    const wall = walls.find((w) => w.id === route.wallId)
    const lat = Number(wall?.coordinates?.lat)
    const lng = Number(wall?.coordinates?.lng)
    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      map.flyTo([lat, lng], 14, { duration: 1 })
    }
  }, [route, walls, map])
  return null
}

export function MapPage() {
  const [searchParams] = useSearchParams()
  const [routes, setRoutes] = useState<Route[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [walls, setWalls] = useState<Wall[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null)
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    async function load() {
      const [routesData, zonesData, wallsData] = await Promise.all([getRoutes(), getZones(), getWalls()])
      setRoutes(routesData.routes)
      setZones(zonesData)
      setWalls(wallsData)
      setLoading(false)
    }
    load()
  }, [])

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
      {/* OpenStreetMap with Leaflet */}
      <MapContainer
        center={defaultCenter}
        zoom={6}
        className="absolute inset-0 z-0"
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToRoute route={selectedRoute} walls={walls} />

        {wallsWithCoords.map((wall) => {
          const wallRoutes = filteredRoutes.filter((r) => r.wallId === wall.id)
          if (wallRoutes.length === 0) return null
          const zone = zones.find((z) => z.id === wall.zoneId)
          return (
            <Marker
              key={wall.id}
              position={[Number(wall.coordinates!.lat), Number(wall.coordinates!.lng)]}
              eventHandlers={{ click: () => setSelectedRoute(wallRoutes[0]) }}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <h3 className="font-bold text-sm">{wall.name}</h3>
                  {zone && <p className="text-xs text-gray-500">{zone.name}</p>}
                  <div className="mt-1 space-y-1">
                    {wallRoutes.map((route) => (
                      <div key={route.id} className="flex items-center justify-between gap-2">
                        <Link
                          to={`/routes/${route.id}`}
                          className="text-xs text-blue-600 hover:underline truncate"
                        >
                          {route.name}
                        </Link>
                        {route.difficulty.free && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded flex-shrink-0">
                            {route.difficulty.free}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

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
                onClick={() => setSelectedRoute(route)}
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
