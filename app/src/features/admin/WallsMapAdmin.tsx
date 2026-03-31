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

function AddWallMarker({ onAdd, disabled }: { onAdd: (lat: number, lng: number) => void, disabled: boolean }) {
  useMapEvents({
    click(e) {
      if (!disabled) onAdd(e.latlng.lat, e.latlng.lng)
    },
  })
  return null;
}

export function WallsMapAdmin({ walls, onSetCoords }: WallsMapAdminProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [addCoords, setAddCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [addWallId, setAddWallId] = useState<string>('');
  const mapRef = useRef<any>(null)
  const addMarkerRef = useRef<any>(null)

  useEffect(() => {
    if (addCoords && addMarkerRef.current) {
      try {
        // Try to open the popup on the underlying Leaflet marker
        const marker = addMarkerRef.current
        if (typeof marker.openPopup === 'function') {
          marker.openPopup()
        } else if (marker.getPopup && marker._map) {
          // fallback: open popup via map
          const popup = marker.getPopup()
          if (popup && marker._map) marker._map.openPopup(popup)
        }
      } catch (e) {
        // ignore
      }
    }
  }, [addCoords])
  // Limpiar marcador temporal si se inicia/cancela edición de una pared existente
  function handleSelect(wallId: string | null) {
    setSelected(wallId);
    setAddCoords(null);
    setAddWallId('');
  }

  // Centrar el mapa en la península ibérica por defecto
  const defaultCenter: [number, number] = [42.7, -2.9]
  const defaultZoom = 6

  const noCoords = walls.filter(w => !w.coordinates || !w.coordinates.lat || !w.coordinates.lng)

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
                click: () => {
                  if (selected === w.id) return;
                  handleSelect(w.id);
                },
              }}
            >
              <Popup>
                <div>
                  <strong>{w.name}</strong>
                  <br />
                  {w.coordinates.lat.toFixed(5)}, {w.coordinates.lng.toFixed(5)}
                  <br />
                  {selected === w.id ? (
                    <>
                      <span className="text-xs text-danger block mb-2">Haz click en el mapa para elegir nueva ubicación</span>
                      <button className="btn-secondary w-full" onClick={(e) => { e.stopPropagation(); handleSelect(null); }}>Cancelar</button>
                    </>
                  ) : (
                    <button
                      className="btn-secondary mt-2"
                      onClick={(e) => { e.stopPropagation(); handleSelect(w.id); }}
                    >
                      Cambiar ubicación
                    </button>
                  )}
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
              handleSelect(null)
            }}
          />
        )}
        <AddWallMarker
          onAdd={(lat, lng) => {
            if (!selected && noCoords.length > 0) {
              setAddCoords({ lat, lng });
              setAddWallId('');
            }
          }}
          disabled={!!selected || !!addCoords}
        />
        {addCoords && (
          <Marker position={[addCoords.lat, addCoords.lng]} icon={wallIcon} ref={(m) => { addMarkerRef.current = m }}>
            <Popup autoPan>
              <div className="space-y-2">
                <div className="text-xs text-gray-500">Asignar a pared:</div>
                <select
                  className="input w-full"
                  value={addWallId}
                  onChange={e => setAddWallId(e.target.value)}
                >
                  <option value="">— Selecciona pared —</option>
                  {noCoords.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    className="btn-primary flex-1"
                    disabled={!addWallId}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (addWallId) {
                        await onSetCoords(addWallId, addCoords.lat, addCoords.lng);
                        setAddCoords(null);
                        setAddWallId('');
                        setSelected(null);
                      }
                    }}
                  >Aceptar</button>
                  <button
                    className="btn-secondary flex-1"
                    onClick={(e) => { e.stopPropagation(); setAddCoords(null); setAddWallId(''); setSelected(null); }}
                  >Cancelar</button>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
        {/* Abrir el popup del marcador temporal al crearlo */}
        {addCoords && addMarkerRef.current && (() => {
          try {
            // marker instance tiene .openPopup()
            addMarkerRef.current.openPopup()
          } catch (e) {
            // noop
          }
          return null
        })()}
      </MapContainer>
    </div>
  )
}
