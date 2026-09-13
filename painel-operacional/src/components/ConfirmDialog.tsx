'use client';

interface Props {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}

export default function ConfirmDialog({ message, onCancel, onConfirm, confirmLabel = 'CONCLUIR' }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-slate-800 p-5 sm:rounded-2xl">
        <p className="mb-4 text-center text-base font-medium text-slate-100">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-slate-700 py-3 text-sm font-semibold text-slate-200"
          >
            CANCELAR
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
