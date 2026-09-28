'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocalizacaoDoc } from '@/lib/useLiveLocation';
import { calcularRumo, distanciaMetros } from '@/lib/geo';

// SVG de carro visto de cima. A rotação fica num <div> interno separado do
// elemento que o Leaflet posiciona — assim as duas transformações (posição
// e giro) não se sobrescrevem.
const SVG_CARRO = `
  <div class="rotacao" style="width:34px;height:34px;transform:rotate(0deg);transition:transform 0.4s ease">
    <svg viewBox="0 0 24 24" width="34" height="34" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5))">
      <circle cx="12" cy="12" r="11" fill="#1568bb" stroke="white" stroke-width="2" />
      <path d="M12 5 L16 13 L12 11 L8 13 Z" fill="white" />
    </svg>
  </div>
`;

function criarIcone() {
  return L.divIcon({
    className: 'marcador-operador',
    html: SVG_CARRO,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

interface MarcadorState {
  marker: L.Marker;
  ultimaPosicao: { lat: number; lng: number };
}

function MarcadoresOperadores({ operadores }: { operadores: LocalizacaoDoc[] }) {
  const map = useMap();
  const marcadoresRef = useRef<Map<string, MarcadorState>>(new Map());

  useEffect(() => {
    const marcadores = marcadoresRef.current;
    const uidsAtuais = new Set(operadores.map((op) => op.uid));

    // Remove do mapa quem não está mais na lista (ex: parou de compartilhar).
    for (const [uid, estado] of marcadores) {
      if (!uidsAtuais.has(uid)) {
        map.removeLayer(estado.marker);
        marcadores.delete(uid);
      }
    }

    for (const op of operadores) {
      const posicaoNova = { lat: op.lat, lng: op.lng };
      const popupHtml = `<strong>${escapeHtml(op.nome)}</strong>${
        op.tarefaAtual ? `<br/>${escapeHtml(op.tarefaAtual)}` : ''
      }`;

      let estado = marcadores.get(op.uid);
      if (!estado) {
        const marker = L.marker([posicaoNova.lat, posicaoNova.lng], { icon: criarIcone() })
          .addTo(map)
          .bindPopup(popupHtml);
        estado = { marker, ultimaPosicao: posicaoNova };
        marcadores.set(op.uid, estado);
        continue;
      }

      const moveu = distanciaMetros(estado.ultimaPosicao, posicaoNova) > 3;
      if (moveu) {
        const rumo = calcularRumo(estado.ultimaPosicao, posicaoNova);
        const elemento = estado.marker.getElement();
        const rotacao = elemento?.querySelector<HTMLDivElement>('.rotacao');
        if (rotacao) rotacao.style.transform = `rotate(${rumo}deg)`;
      }

      estado.marker.setLatLng([posicaoNova.lat, posicaoNova.lng]);
      estado.marker.getPopup()?.setContent(popupHtml);
      estado.ultimaPosicao = posicaoNova;
    }
  }, [map, operadores]);

  // Limpa tudo ao desmontar o mapa.
  useEffect(() => {
    const marcadores = marcadoresRef.current;
    return () => {
      marcadores.forEach((estado) => map.removeLayer(estado.marker));
      marcadores.clear();
    };
  }, [map]);

  return null;
}

function escapeHtml(texto: string): string {
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

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
      <MarcadoresOperadores operadores={operadores} />
    </MapContainer>
  );
}
