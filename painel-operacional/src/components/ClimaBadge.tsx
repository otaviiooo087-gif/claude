'use client';

import { useClimaEndereco } from '@/lib/useClimaEndereco';

interface Props {
  endereco?: string;
  cidade?: string;
  data: string;
}

export default function ClimaBadge({ endereco, cidade, data }: Props) {
  const clima = useClimaEndereco(endereco, cidade, data);
  if (!clima) return null;

  const chuva = clima.chanceChuvaPercent;
  const cor =
    chuva >= 60
      ? 'bg-red-500/20 text-red-400'
      : chuva >= 30
      ? 'bg-amber-500/20 text-amber-400'
      : 'bg-slate-800 text-slate-400';

  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cor}`}>
      🌦️ {chuva}% chuva · {Math.round(clima.tempMaxC)}°/{Math.round(clima.tempMinC)}°
    </span>
  );
}
