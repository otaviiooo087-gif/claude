'use client';

type View = 'home' | 'agenda';

interface Props {
  view: View;
  onChange: (v: View) => void;
  onNew: () => void;
}

export default function BottomNav({ view, onChange, onNew }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 flex items-center justify-around border-t border-slate-800 bg-slate-900/95 py-2 backdrop-blur">
      <button
        onClick={() => onChange('home')}
        className={`flex flex-col items-center gap-0.5 rounded-xl px-6 py-2 text-sm font-medium ${
          view === 'home' ? 'text-brand-500' : 'text-slate-400'
        }`}
      >
        Agora
      </button>

      <button
        onClick={onNew}
        className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-3xl font-bold text-white shadow-lg"
        aria-label="Nova tarefa"
      >
        +
      </button>

      <button
        onClick={() => onChange('agenda')}
        className={`flex flex-col items-center gap-0.5 rounded-xl px-6 py-2 text-sm font-medium ${
          view === 'agenda' ? 'text-brand-500' : 'text-slate-400'
        }`}
      >
        Agenda
      </button>
    </nav>
  );
}
