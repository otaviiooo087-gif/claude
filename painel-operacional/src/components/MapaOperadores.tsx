'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocalizacaoDoc } from '@/lib/useLiveLocation';

// O bundler não resolve os ícones padrão do Leaflet automaticamente; usamos
// um ícone simples via divIcon em vez de depender dos PNGs do pacote.
const icone = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#22c55e;border:3px solid white;box-shadow:0 0 0 2px rgba(0,0,0,0.3)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface Props {
  operadores: LocalizacaoDoc[];
}

export default function MapaOperadores({ operadores }: Props) {
  const centro: [number, number] =
    operadores.length > 0 ? [operadores[0].lat, operadores[0].lng] : [-22.9707, -47.0104]; // Valinhos-SP

  return (
    <MapContainer center={centro} zoom={12} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {operadores.map((op) => (
        <Marker key={op.uid} position={[op.lat, op.lng]} icon={icone}>
          <Popup>
            <strong>{op.nome}</strong>
            {op.tarefaAtual && (
              <>
                <br />
                {op.tarefaAtual}
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
