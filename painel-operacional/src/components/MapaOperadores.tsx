'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocalizacaoDoc } from '@/lib/useLiveLocation';
import { calcularRumo, distanciaMetros, estimarMinutos } from '@/lib/geo';
import { DestinoMap, useDestinos } from '@/lib/useDestinos';

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

const SVG_DESTINO = `
  <svg viewBox="0 0 24 24" width="26" height="26" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.45))">
    <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8z" fill="#ef4444" stroke="white" stroke-width="1.5" />
    <circle cx="12" cy="10" r="3" fill="white" />
  </svg>
`;

function criarIconeCarro() {
  return L.divIcon({
    className: 'marcador-operador',
    html: SVG_CARRO,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

function criarIconeDestino() {
  return L.divIcon({
    className: 'marcador-destino',
    html: SVG_DESTINO,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

interface MarcadorCarro {
  marker: L.Marker;
  ultimaPosicao: { lat: number; lng: number };
}

interface MarcadorDestino {
  marker: L.Marker;
  linha: L.Polyline;
  coords: { lat: number; lng: number };
}

function MarcadoresOperadores({ operadores, destinos }: { operadores: LocalizacaoDoc[]; destinos: DestinoMap }) {
  const map = useMap();
  const carrosRef = useRef<Map<string, MarcadorCarro>>(new Map());
  const destinosRef = useRef<Map<string, MarcadorDestino>>(new Map());

  useEffect(() => {
    const carros = carrosRef.current;
    const destinosMarcados = destinosRef.current;
    const uidsAtuais = new Set(operadores.map((op) => op.uid));

    // Remove do mapa quem não está mais na lista (ex: parou de compartilhar).
    for (const [uid, estado] of carros) {
      if (!uidsAtuais.has(uid)) {
        map.removeLayer(estado.marker);
        carros.delete(uid);
      }
    }
    for (const [uid, estado] of destinosMarcados) {
      if (!uidsAtuais.has(uid) || !destinos[uid]) {
        map.removeLayer(estado.marker);
        map.removeLayer(estado.linha);
        destinosMarcados.delete(uid);
      }
    }

    for (const op of operadores) {
      const posicaoNova = { lat: op.lat, lng: op.lng };
      const popupHtml = `<strong>${escapeHtml(op.nome)}</strong>${
        op.tarefaAtual ? `<br/>${escapeHtml(op.tarefaAtual)}` : ''
      }`;

      let carro = carros.get(op.uid);
      if (!carro) {
        const marker = L.marker([posicaoNova.lat, posicaoNova.lng], { icon: criarIconeCarro() })
          .addTo(map)
          .bindPopup(popupHtml);
        carro = { marker, ultimaPosicao: posicaoNova };
        carros.set(op.uid, carro);
      } else {
        const moveu = distanciaMetros(carro.ultimaPosicao, posicaoNova) > 3;
        if (moveu) {
          const rumo = calcularRumo(carro.ultimaPosicao, posicaoNova);
          const elemento = carro.marker.getElement();
          const rotacao = elemento?.querySelector<HTMLDivElement>('.rotacao');
          if (rotacao) rotacao.style.transform = `rotate(${rumo}deg)`;
        }
        carro.marker.setLatLng([posicaoNova.lat, posicaoNova.lng]);
        carro.marker.getPopup()?.setContent(popupHtml);
        carro.ultimaPosicao = posicaoNova;
      }

      const destino = destinos[op.uid];
      if (destino) {
        const distancia = distanciaMetros(posicaoNova, destino);
        const minutos = estimarMinutos(distancia);
        const km = (distancia / 1000).toFixed(1);
        const textoEta = `🏁 ${minutos} min · ${km} km`;

        if (carro.marker.getTooltip()) {
          carro.marker.setTooltipContent(textoEta);
        } else {
          carro.marker.bindTooltip(textoEta, {
            permanent: true,
            direction: 'top',
            offset: [0, -22],
            className: 'etiqueta-eta',
          });
        }

        let estadoDestino = destinosMarcados.get(op.uid);
        if (!estadoDestino) {
          const marker = L.marker([destino.lat, destino.lng], { icon: criarIconeDestino() })
            .addTo(map)
            .bindPopup(`Destino de ${escapeHtml(op.nome)}${op.tarefaAtual ? `<br/>${escapeHtml(op.tarefaAtual)}` : ''}`);
          const linha = L.polyline(
            [
              [posicaoNova.lat, posicaoNova.lng],
              [destino.lat, destino.lng],
            ],
            { color: '#1568bb', weight: 3, opacity: 0.6, dashArray: '6 8' }
          ).addTo(map);
          destinosMarcados.set(op.uid, { marker, linha, coords: destino });
        } else {
          if (estadoDestino.coords.lat !== destino.lat || estadoDestino.coords.lng !== destino.lng) {
            estadoDestino.marker.setLatLng([destino.lat, destino.lng]);
            estadoDestino.coords = destino;
          }
          estadoDestino.linha.setLatLngs([
            [posicaoNova.lat, posicaoNova.lng],
            [destino.lat, destino.lng],
          ]);
        }
      } else if (carro.marker.getTooltip()) {
        carro.marker.unbindTooltip();
      }
    }
  }, [map, operadores, destinos]);

  // Limpa tudo ao desmontar o mapa.
  useEffect(() => {
    const carros = carrosRef.current;
    const destinosMarcados = destinosRef.current;
    return () => {
      carros.forEach((estado) => map.removeLayer(estado.marker));
      carros.clear();
      destinosMarcados.forEach((estado) => {
        map.removeLayer(estado.marker);
        map.removeLayer(estado.linha);
      });
      destinosMarcados.clear();
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
  const destinos = useDestinos(operadores);
  const centro: [number, number] =
    operadores.length > 0 ? [operadores[0].lat, operadores[0].lng] : [-22.9707, -47.0104]; // Valinhos-SP

  return (
    <MapContainer center={centro} zoom={12} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        className="tiles-limpo"
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarcadoresOperadores operadores={operadores} destinos={destinos} />
    </MapContainer>
  );
}
