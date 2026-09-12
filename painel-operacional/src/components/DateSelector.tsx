'use client';

import { formatDateChip } from '@/lib/format';

interface Props {
  dates: string[];
  selected: string;
  onSelect: (iso: string) => void;
}

export default function DateSelector({ dates, selected, onSelect }: Props) {
  if (dates.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {dates.map((iso) => (
        <button
          key={iso}
          onClick={() => onSelect(iso)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
            iso === selected ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-300'
          }`}
        >
          {formatDateChip(iso)}
        </button>
      ))}
    </div>
  );
}
