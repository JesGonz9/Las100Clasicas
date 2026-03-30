import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Wall } from '@/models'

// Icono personalizado para los marcadores
const wallIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
})

interface WallsMapAdminProps {
  walls: Wall[]
  onSetCoords: (wallId: string, lat: number, lng: number) => void
}

function LocationSetter({ wallId, onSet }: { wallId: string, onSet: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSet(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function WallsMapAdmin({ walls, onSetCoords }: WallsMapAdminProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const mapRef = useRef<any>(null)

  // Centrar el mapa en la península ibérica por defecto
  const defaultCenter = [42.7, -2.9]
  const defaultZoom = 6

  return (
    <div className="w-full h-[500px] rounded-lg overflow-hidden border mb-8">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {walls.map((w) =>
          w.coordinates && w.coordinates.lat && w.coordinates.lng ? (
            <Marker
              key={w.id}
              position={[w.coordinates.lat, w.coordinates.lng]}
              icon={wallIcon}
              eventHandlers={{
                click: () => setSelected(w.id),
              }}
            >
              <Popup>
                <div>
                  <strong>{w.name}</strong>
                  <br />
                  {w.coordinates.lat.toFixed(5)}, {w.coordinates.lng.toFixed(5)}
                  <br />
                  <button
                    className="btn-secondary mt-2"
                    onClick={() => setSelected(w.id)}
                  >
                    Cambiar ubicación
                  </button>
                </div>
              </Popup>
            </Marker>
          ) : null
        )}
        {selected && (
          <LocationSetter
            wallId={selected}
            onSet={(lat, lng) => {
              onSetCoords(selected, lat, lng)
              setSelected(null)
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}
