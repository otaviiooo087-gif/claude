'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { buscarTrajetoDoDia, PontoTrajeto } from '@/lib/trajetoReplay';
import { distanciaMetros } from '@/lib/geo';
import { LocalizacaoDoc } from '@/lib/useLiveLocation';
import { buscarTarefasAtribuidas } from '@/lib/tarefasAtribuidas';
import { Task, TYPE_LABELS, STATUS_LABELS } from '@/lib/types';
import { todayISO, formatCurrency } from '@/lib/format';

const SVG_CARRO = `
  <svg viewBox="0 0 24 24" width="30" height="30" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.5))">
    <circle cx="12" cy="12" r="11" fill="#1568bb" stroke="white" stroke-width="2" />
    <path d="M12 5 L16 13 L12 11 L8 13 Z" fill="white" />
  </svg>
`;

const DURACAO_ANIMACAO_MS = 12000;

function minutosDesde(ms: number): number {
  return Math.max(0, Math.floor((Date.now() - ms) / 60000));
}

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
  operador: LocalizacaoDoc;
  onFechar: () => void;
}

export default function TrajetoReplayModal({ operador, onFechar }: Props) {
  const [pontos, setPontos] = useState<PontoTrajeto[] | null>(null);
  const [erroTrajeto, setErroTrajeto] = useState<string | null>(null);
  const [indice, setIndice] = useState(0);
  const [tocando, setTocando] = useState(false);

  const [tarefas, setTarefas] = useState<Task[] | null>(null);
  const [erroTarefas, setErroTarefas] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    buscarTrajetoDoDia(operador.uid)
      .then((lista) => {
        if (cancelado) return;
        setPontos(lista);
        setTocando(lista.length > 1);
      })
      .catch((e) => {
        if (!cancelado) setErroTrajeto(e instanceof Error ? e.message : 'Não consegui carregar o trajeto.');
      });
    return () => {
      cancelado = true;
    };
  }, [operador.uid]);

  useEffect(() => {
    let cancelado = false;
    buscarTarefasAtribuidas(operador.uid)
      .then((lista) => {
        if (cancelado) return;
        const hoje = todayISO();
        setTarefas(
          lista.filter((t) => t.data === hoje).sort((a, b) => a.horarioComparacao.localeCompare(b.horarioComparacao))
        );
      })
      .catch((e) => {
        if (!cancelado) setErroTarefas(e instanceof Error ? e.message : 'Não consegui carregar as tarefas.');
      });
    return () => {
      cancelado = true;
    };
  }, [operador.uid]);

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
  const centro: [number, number] = pontoAtual
    ? [pontoAtual.lat, pontoAtual.lng]
    : [operador.lat, operador.lng];

  const semSinalHaMuito = minutosDesde(operador.atualizadoEm) > 5;

  return (
    <div className="fixed inset-0 z-[5500] flex items-end bg-black/70" onClick={onFechar}>
      <div
        className="flex max-h-[92vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 p-4">
          <h2 className="text-base font-bold text-slate-50">{operador.nome}</h2>
          <button onClick={onFechar} className="p-1 text-xl text-slate-400">
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4">
          <section className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Status agora</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-200">
                {operador.tarefaAtual ? `Em: ${operador.tarefaAtual}` : 'Sem tarefa em andamento'}
                {operador.tarefaHorario ? ` · ${operador.tarefaHorario}` : ''}
              </span>
              {semSinalHaMuito && (
                <span className="text-xs font-semibold text-amber-400">
                  sem sinal há {minutosDesde(operador.atualizadoEm)} min
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">Parado há {minutosDesde(operador.paradoDesde)} min</p>
            {stats && <p className="mt-1 text-xs text-slate-500">Iniciou o dia (primeiro sinal): {stats.inicio}</p>}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Destinos de hoje</h3>
            {erroTarefas && <p className="text-xs text-red-400">{erroTarefas}</p>}
            {tarefas === null && !erroTarefas && <p className="text-xs text-slate-500">Carregando...</p>}
            {tarefas && tarefas.length === 0 && (
              <p className="text-xs text-slate-500">Nenhuma tarefa atribuída pra hoje.</p>
            )}
            {tarefas && tarefas.length > 0 && (
              <div className="flex flex-col gap-2">
                {tarefas.map((t) => (
                  <div key={t.id} className="rounded-lg bg-slate-900 px-3 py-2 ring-1 ring-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-100">
                        {t.horarioComparacao} · {t.cliente}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-slate-500">{TYPE_LABELS[t.tipo]}</span>
                    </div>
                    {t.endereco && <p className="text-xs text-slate-500">{t.endereco}</p>}
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span
                        className={
                          t.status === 'CONCLUIDA' ? 'text-emerald-400' : t.cancelada ? 'text-red-400' : 'text-slate-400'
                        }
                      >
                        {t.cancelada ? 'Cancelada' : STATUS_LABELS[t.status]}
                      </span>
                      {t.valor !== undefined && <span className="text-slate-500">{formatCurrency(t.valor)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Trajeto de hoje</h3>
              {stats && (
                <span className="text-xs text-slate-500">
                  {stats.inicio} → {stats.fim} · {stats.duracaoMin} min · {stats.distanciaKm} km
                </span>
              )}
            </div>

            <div className="h-[45vh] w-full overflow-hidden rounded-xl">
              {erroTrajeto ? (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-400">
                  {erroTrajeto}
                </div>
              ) : pontos === null ? (
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
              <div className="mt-3 flex flex-col gap-2">
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
                  <span>
                    {new Date(pontos[indice].criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
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
          </section>
        </div>
      </div>
    </div>
  );
}
