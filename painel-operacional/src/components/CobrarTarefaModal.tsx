'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { Configuracoes, ouvirConfiguracoes } from '@/lib/configuracoes';
import { montarPayloadPix } from '@/lib/pix';
import { formatCurrency } from '@/lib/format';

interface Props {
  cliente: string;
  valor: number;
  identificador: string;
  jaConfirmado: boolean;
  onConfirmarRecebimento: () => void;
  onFechar: () => void;
}

export default function CobrarTarefaModal({
  cliente,
  valor,
  identificador,
  jaConfirmado,
  onConfirmarRecebimento,
  onFechar,
}: Props) {
  const [config, setConfig] = useState<Configuracoes | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => ouvirConfiguracoes(setConfig), []);

  const payload = useMemo(() => {
    if (!config?.chavePix || valor <= 0) return null;
    return montarPayloadPix({
      chave: config.chavePix,
      nomeRecebedor: config.nomeRecebedorPix || 'Zimba Festa',
      cidadeRecebedor: config.cidadeRecebedorPix || 'Valinhos',
      valor,
      identificador,
    });
  }, [config, valor, identificador]);

  useEffect(() => {
    if (!payload) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(payload, { width: 260, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [payload]);

  async function copiar() {
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(payload);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[4000] flex items-end bg-black/60" onClick={onFechar}>
      <div
        className="mx-auto max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-slate-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-50">Cobrar via Pix — {cliente}</h2>
          <button onClick={onFechar} className="p-1 text-xl text-slate-400">
            ×
          </button>
        </div>

        {!config?.chavePix ? (
          <div className="flex flex-col gap-3 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-300">
            <p>O admin ainda não configurou a chave Pix.</p>
            <Link href="/admin/configuracoes" className="font-semibold underline" onClick={onFechar}>
              Ir para Configurações
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {qrDataUrl && (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR Code Pix" className="h-64 w-64" />
                <span className="text-lg font-bold text-slate-900">{formatCurrency(valor)}</span>
              </div>
            )}

            {payload && (
              <div className="flex flex-col gap-2">
                <textarea
                  readOnly
                  value={payload}
                  rows={3}
                  className="w-full resize-none rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300 outline-none ring-1 ring-slate-700"
                  onFocus={(e) => e.target.select()}
                />
                <button onClick={copiar} className="rounded-xl bg-slate-700 py-3 text-sm font-bold text-slate-100">
                  {copiado ? 'Código copiado!' : 'Copiar código Pix'}
                </button>
              </div>
            )}

            {jaConfirmado ? (
              <p className="rounded-xl bg-emerald-500/10 py-3 text-center text-sm font-bold text-emerald-400">
                ✓ Pagamento confirmado
              </p>
            ) : (
              <button
                onClick={() => {
                  onConfirmarRecebimento();
                  onFechar();
                }}
                className="rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white"
              >
                Já recebi o pagamento
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
