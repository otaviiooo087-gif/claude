'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buscarTrajetoDoDia, PontoTrajeto } from '@/lib/trajetoReplay';
import { distanciaMetros } from '@/lib/geo';

const SVG_CARRO = `
  <svg viewBox="0 0 24 24" width="30" height="30" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5))">
    <circle cx="12" cy="12" r="11" fill="#1568bb" stroke="white" stroke-width="2" />
    <path d="M12 5 L16 13 L12 11 L8 13 Z" fill="white" />
  </svg>
`;

const DURACAO_ANIMACAO_MS = 12000;

function AnimacaoTrajeto({ pontos, indice }: { pontos: PontoTrajeto[]; indice: number }) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);
  const ajustouRef = useRef(false);

  useEffect(() => {
    if (pontos.length === 0) return;
    const latlngs = pontos.map((p) => [p.lat, p.lng] as [number, number]);
    const linha = L.polyline(latlngs, { color: '#1568bb', weight: 4, opacity: 0.45 }).addTo(map);
    const icon = L.divIcon({
      className: 'marcador-replay',
      html: SVG_CARRO,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    markerRef.current = L.marker(latlngs[0], { icon }).addTo(map);

    if (!ajustouRef.current) {
      map.fitBounds(linha.getBounds(), { padding: [30, 30] });
      ajustouRef.current = true;
    }

    return () => {
      map.removeLayer(linha);
      if (markerRef.current) map.removeLayer(markerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pontos]);

  useEffect(() => {
    const ponto = pontos[indice];
    if (ponto && markerRef.current) markerRef.current.setLatLng([ponto.lat, ponto.lng]);
  }, [indice, pontos]);

  return null;
}

interface Props {
  uid: string;
  nome: string;
  onFechar: () => void;
}

export default function TrajetoReplayModal({ uid, nome, onFechar }: Props) {
  const [pontos, setPontos] = useState<PontoTrajeto[] | null>(null);
  const [indice, setIndice] = useState(0);
  const [tocando, setTocando] = useState(false);

  useEffect(() => {
    buscarTrajetoDoDia(uid).then((lista) => {
      setPontos(lista);
      setTocando(lista.length > 1);
    });
  }, [uid]);

  useEffect(() => {
    if (!tocando || !pontos || pontos.length < 2) return;
    const intervaloPorPonto = DURACAO_ANIMACAO_MS / pontos.length;
    const id = setInterval(() => {
      setIndice((i) => {
        if (i >= pontos.length - 1) {
          setTocando(false);
          return i;
        }
        return i + 1;
      });
    }, intervaloPorPonto);
    return () => clearInterval(id);
  }, [tocando, pontos]);

  const stats = useMemo(() => {
    if (!pontos || pontos.length < 2) return null;
    const inicio = pontos[0].criadoEm;
    const fim = pontos[pontos.length - 1].criadoEm;
    let distanciaTotal = 0;
    for (let i = 1; i < pontos.length; i++) distanciaTotal += distanciaMetros(pontos[i - 1], pontos[i]);
    return {
      duracaoMin: Math.round((fim - inicio) / 60000),
      distanciaKm: (distanciaTotal / 1000).toFixed(1),
      inicio: new Date(inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      fim: new Date(fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
  }, [pontos]);

  const pontoAtual = pontos?.[indice];
  const centro: [number, number] = pontoAtual ? [pontoAtual.lat, pontoAtual.lng] : [-22.9707, -47.0104];

  return (
    <div className="fixed inset-0 z-[5500] flex items-end bg-black/70" onClick={onFechar}>
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 p-4">
          <div>
            <h2 className="text-base font-bold text-slate-50">Trajeto de hoje — {nome}</h2>
            {stats && (
              <p className="text-xs text-slate-400">
                {stats.inicio} → {stats.fim} · {stats.duracaoMin} min · {stats.distanciaKm} km
              </p>
            )}
          </div>
          <button onClick={onFechar} className="p-1 text-xl text-slate-400">
            ×
          </button>
        </div>

        <div className="h-[50vh] w-full">
          {pontos === null ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">Carregando...</div>
          ) : pontos.length < 2 ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
              Ainda não há trajeto suficiente registrado hoje pra esse operador.
            </div>
          ) : (
            <MapContainer center={centro} zoom={13} className="h-full w-full" scrollWheelZoom>
              <TileLayer
                className="tiles-limpo"
                attribution="&copy; OpenStreetMap"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <AnimacaoTrajeto pontos={pontos} indice={indice} />
            </MapContainer>
          )}
        </div>

        {pontos && pontos.length >= 2 && (
          <div className="flex flex-col gap-2 p-4">
            <input
              type="range"
              min={0}
              max={pontos.length - 1}
              value={indice}
              onChange={(e) => {
                setTocando(false);
                setIndice(Number(e.target.value));
              }}
              className="w-full"
            />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{new Date(pontos[indice].criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              <button
                onClick={() => {
                  if (indice >= pontos.length - 1) setIndice(0);
                  setTocando((v) => !v);
                }}
                className="rounded-full bg-brand-500 px-4 py-1.5 text-xs font-bold text-white"
              >
                {tocando ? 'Pausar' : indice >= pontos.length - 1 ? 'Repetir' : 'Reproduzir'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
